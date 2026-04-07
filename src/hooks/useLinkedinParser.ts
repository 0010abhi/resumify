import { GoogleGenAI } from "@google/genai";
import { useState, useEffect } from "react";
import geminiPrompts from "../prompts/gemini-prompts";
const GOOGLE_AI_API_KEY = import.meta.env.VITE_GOOGLE_AI_API_KEY;
const ai = new GoogleGenAI({ apiKey: GOOGLE_AI_API_KEY! });


export default function useLinkedInParser(data: any, type = "parseResume") {
    const [parseResume, setParseResume] = useState<any>(null);
    // const [strategy, setStrategy] = useState<any>(null);
    const [strategy, setStrategy] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    async function generateParsedData() {
        if (data == null) return;
        const contents = [
            { text: geminiPrompts[type]?.text },
            {
                inlineData: {
                    mimeType: 'application/pdf',
                    data: data
                }
            }
        ];
        const response: any = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: contents
        });

        //             "content": {
        //                 "parts": [
        //                     {
        //                         "text": "```json\n{\n  \"data\": {\n    \"name\": \"Abhishek Sachdeva\",\n    \"email\": \"0010abhi@gmail.com\",\n    \"phone\": null,\n    \"skills\": [\n      \"Datadog\",\n      \"Harness\",\n      \"Cypress\",\n      \"React\",\n      \"React Native\",\n      \"Node.js\",\n      \"Cloud-based applications\",\n      \"SonarQube\",\n      \"Elastic Search\",\n      \"CAL & FPTI logging systems\",\n      \"Node modules\",\n      \"CI/CD pipelines\",\n      \"Micro-frontend architecture\",\n      \"Keycloak\",\n      \"Microservices architecture\",\n      \"Kafka\",\n      \"Elasticsearch\",\n      \"Google APIs\",\n      \"Payment gateway integration\",\n      \"UI enhancements\",\n      \"ERP systems\",\n      \"Apollo Client\",\n      \"Express-GraphQL\",\n      \"AWS\",\n      \"Docker\",\n      \"UPI autopay mandate\",\n      \"Okta\",\n      \"REST API\",\n      \"Angular\",\n      \"AngularJS\",\n      \"jQuery\",\n      \"HttpInterceptor\",\n      \"Print Baggage File\",\n      \"Frontend Error Logger\"\n    ],\n    \"links\": [\n      {\n        \"type\": \"LinkedIn\",\n        \"url\": \"https://www.linkedin.com/in/0010abhi\"\n      }\n    ],\n    \"professionalSummary\": \"Senior Software Engineer with 10 years of experience in software development, specializing in front-end engineering and end-to-end product delivery. Over the past 7 years, I've focused on React, React Native, Node.js, and cloud-based applications. I've contributed to multiple organizations by building scalable solutions, accelerating product growth, and delivering impactful MVPs and POCs.\",\n    \"experience\": [\n      {\n        \"title\": \"Senior Software Developer (Contract)\",\n        \"company\": \"PayPal\",\n        \"duration\": \"August 2024 - December 2025 (1 year 5 months)\",\n        \"start\": \"08-2024\",\n        \"end\": \"12-2025\",\n        \"responsibilities\": [\n          \"Improved overall code quality by resolving SonarQube-reported issues and increasing FT and UT test coverage.\",\n          \"Triaged and diagnosed issues using Datadog, Elastic Search dashboards, and PayPal's CAL & FPTI logging systems.\",\n          \"Developed and maintained features and bug fixes while ensuring project alignment with the PYPL ecosystem, including managing Node modules for the Donate Button.\",\n          \"Assisted in deploying production changes using CI/CD pipelines and ensuring safe, gradual rollouts.\",\n          \"Gained hands-on experience with micro-frontend architecture and resolving security-related issues.\"\n        ]\n      },\n      {\n        \"title\": \"Senior Software Engineer\",\n        \"company\": \"Vertisystem\",\n        \"duration\": \"December 2022 - October 2023 (11 months)\",\n        \"start\": \"12-2022\",\n        \"end\": \"10-2023\",\n        \"responsibilities\": [\n          \"Initiated a low-code/no-code product tailored to the retail industry and developed shared components using React.\",\n          \"Implemented modules for creating, updating, and viewing projects, and integrated authentication using Keycloak.\",\n          \"Gained experience with basic tasks in microservices architecture, Kafka, and Elasticsearch.\"\n        ]\n      },\n      {\n        \"title\": \"Freelance Software Developer\",\n        \"company\": \"Freelance\",\n        \"duration\": \"July 2019 - November 2022 (3 years 5 months)\",\n        \"start\": \"07-2019\",\n        \"end\": \"11-2022\",\n        \"responsibilities\": [\n          \"Collaborated with diverse clients on various deadline-driven projects, demonstrating a strong aptitude for understanding business needs and providing tailored solutions.\",\n          \"Spearheaded React architecture, integrated Google APIs, and implemented payment gateway integration for an MVP for Aerologix.\",\n          \"Contributed to product management features, UI enhancements, bug fixes, and unit testing for ERP systems.\",\n          \"Developed proof-of-concept for a SaaS project financing platform (Octave) using React, Apollo Client, Express-GraphQL, AWS, and Docker.\",\n          \"Contributed to the frontend UPI autopay mandate feature for the Simpl mobile app.\",\n          \"Worked with clients such as Netwila, Upshift Cars, MyAva, and Premier LPG on their web and mobile-based applications.\"\n        ]\n      },\n      {\n        \"title\": \"SDE - 1 (UI)\",\n        \"company\": \"FP Tech Science Pvt. Ltd.\",\n        \"duration\": \"April 2019 - April 2020 (1 year 1 month)\",\n        \"start\": \"04-2019\",\n        \"end\": \"04-2020\",\n        \"responsibilities\": [\n          \"Worked on internal portals of an e-commerce platform, including Category Account Terminal (CAT) and Marketing Account Terminal (MAT).\",\n          \"Refactored CAT to adopt a common architecture with MAT, reducing system bugs and simplifying debugging.\",\n          \"Initiated MAT development, including shared components, an Incentive Engine module, and authentication using Okta.\"\n        ]\n      },\n      {\n        \"title\": \"Software Developer\",\n        \"company\": \"CoWrks\",\n        \"duration\": \"July 2018 - March 2019 (9 months)\",\n        \"start\": \"07-2018\",\n        \"end\": \"03-2019\",\n        \"responsibilities\": [\n          \"Worked on products Connect (Web & Mobile), Arrivè (iPad), and Nucleus (Web).\",\n          \"Developed features including Community Support, Community Search, User Profile, and related admin modules.\",\n          \"Optimized applications by upgrading React Navigation, integrating API-v2, and implementing solutions for infinite list feeds.\",\n          \"Contributed to REST API development for visitor management and third-party integration, such as Shoptree.\"\n        ]\n      },\n      {\n        \"title\": \"Software Developer\",\n        \"company\": \"Fintellix Solutions (formerly iCreate)\",\n        \"duration\": \"December 2017 - June 2018 (7 months)\",\n        \"start\": \"12-2017\",\n        \"end\": \"06-2018\",\n        \"responsibilities\": [\n          \"Developed a POC for a regulatory system web application using Angular for PayPal India, initiating an Angular project, developing reporting and dashboard analytics modules, and contributing to Node.js middleware.\",\n          \"Participated in scrum planning and deployment infrastructure planning.\"\n        ]\n      },\n      {\n        \"title\": \"Software Engineer\",\n        \"company\": \"Mindtree\",\n        \"duration\": \"December 2015 - December 2017 (2 years 1 month)\",\n        \"start\": \"12-2015\",\n        \"end\": \"12-2017\",\n        \"responsibilities\": [\n          \"Developed HttpInterceptor, Print Baggage File, Frontend Error Logger, and Application Modes, and collaborated on delayed and damaged bag module using AngularJS, jQuery, and Angular for aviation client SITA.\"\n        ]\n      },\n      {\n        \"title\": \"Engineer\",\n        \"company\": \"Mindtree\",\n        \"duration\": \"October 2015 - December 2015 (3 months)\",\n        \"start\": \"10-2015\",\n        \"end\": \"12-2015\",\n        \"responsibilities\": []\n      },\n      {\n        \"title\": \"Internship, Web Development\",\n        \"company\": \"Ahex Technologies\",\n        \"duration\": \"January 2015 - June 2015\",\n        \"start\": \"01-2015\",\n        \"end\": \"06-2015\",\n        \"responsibilities\": []\n      }\n    ],\n    \"education\": [\n      {\n        \"degree\": \"Bachelor of Technology (B.Tech.), Computer Science\",\n        \"school\": \"The ICFAI University, Dehradun\",\n        \"duration\": \"2011 - 2015\",\n        \"start\": \"01-2011\",\n        \"end\": \"12-2015\",\n        \"description\": null\n      }\n    ],\n    \"achievements\": []\n  }\n}\n```"
        //                     }
        //                 ],
        //                 "role": "model"
        //             },
        //             "finishReason": "STOP",
        //             "index": 0
        //         }
        //     ],
        //     "usageMetadata": {
        //         "promptTokenCount": 1308,
        //         "candidatesTokenCount": 1932,
        //         "totalTokenCount": 3467,
        //         "promptTokensDetails": [
        //             {
        //                 "modality": "TEXT",
        //                 "tokenCount": 276
        //             },
        //             {
        //                 "modality": "DOCUMENT",
        //                 "tokenCount": 1032
        //             }
        //         ],
        //         "thoughtsTokenCount": 227
        //     },
        //     "modelVersion": "gemini-2.5-flash",
        //     "responseId": "pYJyafaZEbaNg8UPvLaaqQo"
        // };
        setParseResume(JSON.parse(response?.candidates[0]?.content?.parts[0]?.text.replace(/```json|```/g, "").trim()));
    }

    async function handleStrategy() {
        if (data == null) return;
        // const response: any = await ai.models.generateContent({
        //     model: "gemini-2.5-flash",
        //     contents: contents
        // });
        // console.log("Strategy response:", response);
        // setStrategy(response?.candidates[0].content.parts[0].text.trim());
        generateStrategy();

    }

    const generateStrategy = async () => {
        setStrategy(""); // Clear previous content
        setIsLoading(true);
        const contents = [
            { text: geminiPrompts[type] },
            // {
            //     inlineData: {
            //         mimeType: 'application/json',
            //         data: JSON.stringify(data)
            //     }
            // }
        ];

        try {
            // 1. Use generateContentStream instead of generateContent
            const result: any = await ai.models.generateContentStream({
                model: "gemini-2.5-flash", // Use your specific model version
                contents: contents
            });

            // 2. Iterate through the stream
            for await (const chunk of result.stream) {
                const chunkText = chunk.text();

                // 3. Append chunk to state using functional update
                setStrategy((prev: any) => prev + chunkText);
            }
        } catch (error) {
            console.error("Streaming error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (data && type === "parseResume") {
            generateParsedData();
        }
        if (data && type === "suggestStrategy") {
            // Implement strategy suggestion logic here, similar to generateParsedData but with a different prompt
            handleStrategy();
        }

    }, [data, type]);



    return { strategy, parseResume };
}