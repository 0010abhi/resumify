import { corsHeaders } from "../_shared/cors.ts";
import { generateWithRetry } from "../_shared/gemini.ts";
import { createUserClient, supabaseAdmin } from "../_shared/supabase-admin.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";

const PARSE_RESUME_PROMPT = `Parse the following Linkedin resume and extract the
name, email, phone number, skills, experience and education in json object like
{
    data: {
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        skills: ['JavaScript', 'React'],
        links: [{
            type: 'LinkedIn',
            url: 'https://www.linkedin.com/in/johndoe'
        }],
        professionalSummary: '*',
        experience: [{
            title: 'Software Engineer',
            company: 'ABC Corp',
            duration: '2020 - Present',
            start: 'mm-yyyy',
            end: 'mm-yyyy',
            responsibilities: ['*']
            }],
        education: [{
            degree: 'B.S. Computer Science',
            school: 'XYZ University',
            duration: '2016 - 2020',
            start: 'mm-yyyy',
            end: 'mm-yyyy',
            description: '*'
        }],
        achievements: ['*']
        }}`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    let isAuthenticated = false;

    if (authHeader) {
      const userClient = createUserClient(authHeader);
      const { data: { user } } = await userClient.auth.getUser();
      if (user) isAuthenticated = true;
    }

    // Rate limit unauthenticated requests: 3 per hour per IP
    if (!isAuthenticated) {
      const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        req.headers.get("x-real-ip") ??
        "unknown";

      const { allowed, remaining, resetAt } = await checkRateLimit(ip, "parse-resume");

      if (!allowed) {
        return new Response(
          JSON.stringify({
            error: "RATE_LIMIT_EXCEEDED",
            message: "You've used your 3 free resume parses this hour. Sign in for unlimited access.",
            requiresAuth: true,
            resetAt: resetAt.toISOString(),
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Unauthenticated parse-resume: ip=${ip} remaining=${remaining}`);
    }

    const { pdfBase64, fileName = "resume.pdf" } = await req.json();
    if (!pdfBase64) {
      return new Response(JSON.stringify({ error: "pdfBase64 is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Parse PDF with Gemini
    const raw = await generateWithRetry([
      { text: PARSE_RESUME_PROMPT },
      { inlineData: { mimeType: "application/pdf", data: pdfBase64 } },
    ]);
    const parsedData = JSON.parse(raw.replace(/```json|```/g, "").trim());

    // 2. Upload original PDF to temp storage
    const tempId = crypto.randomUUID();
    const storagePath = `temp/${tempId}.pdf`;
    const pdfBytes = Uint8Array.from(atob(pdfBase64), (c) => c.charCodeAt(0));

    const { error: storageError } = await supabaseAdmin.storage
      .from("resume-pdfs")
      .upload(storagePath, pdfBytes, { contentType: "application/pdf" });

    if (storageError) {
      // Non-fatal: log but still return parsed data without a tempId
      console.error("Temp storage upload failed:", storageError.message);
      return new Response(JSON.stringify(parsedData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Save parsed data + storage path in temp_resumes table
    const { error: dbError } = await supabaseAdmin.from("temp_resumes").insert({
      id: tempId,
      storage_path: storagePath,
      file_name: fileName,
      parsed_data: parsedData,
    });

    if (dbError) {
      console.error("temp_resumes insert failed:", dbError.message);
      // Clean up the uploaded file
      await supabaseAdmin.storage.from("resume-pdfs").remove([storagePath]);
      return new Response(JSON.stringify(parsedData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return parsed data + tempId so frontend can claim it after login
    return new Response(JSON.stringify({ ...parsedData, tempId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("parse-resume error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
