const geminiPrompts: any = {
    "parseResume": {
        text: `Parse the following Linkedin resume and extract the 
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
                            }}` 
    },
    "suggestStrategy": `
        I am actively applying for jobs, and my last working day was 31 Dec 2025. 
        As you know, my development profile, I am half there and want to get a job 
        as early as possible for senior roles 
        like - Senior Frontend Developer, 
            Full Stack Engineer, 
            Senior Full Stack Engineer, 
            Staff Software Engineer.
        I am mostly applying through 
            LinkedIn Easy Apply, 
            at their Direct career page using LinkedIn Apply, 
            Wellfound, 
            Naukri, 
            Few Remote portals (Turing, Crossover, Arc Dev, etc. ), 
            Cutshort. 
        I am also providing a current resume. 
        Suggest to me any changes if needed and why. 
        Give me more about 
            job hunting strategy,
            salary negotiation,
            behavioral interview and 
            must have mental model for senior position. 
        Give me back output resume in pdf by updating suggested changes. 
        Complete PDF Notebook for all topics asked more about.
    `
};

export default geminiPrompts;