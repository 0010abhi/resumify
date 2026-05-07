export const PARSE_RESUME_PROMPT = `Parse the following Linkedin resume and extract the
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
