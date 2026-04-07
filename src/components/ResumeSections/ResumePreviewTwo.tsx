import { DevicePhoneMobileIcon, EnvelopeIcon, MapPinIcon, LinkIcon } from '@heroicons/react/24/solid'

export default function ResumePreviewTwo({ data }: { data: any }) {
    return <>
        <div className="p-4">
            <div className='pb-1'>
                <div className="text-3xl text-sky-600 text-center">{data.name.toUpperCase()}</div>
                <p className="title">{data.title}</p>
            </div>
            <div>
                {/* <img src="via.placeholder.com" alt="Your Photo" className="profile-pic" /> */}
            </div>
            <div className='flex text-slate-500 justify-center'>
                <p><EnvelopeIcon className="inline-block w-5 h-5 mr-1" />{data.email}</p>
                <p><DevicePhoneMobileIcon className="inline-block w-5 h-5 mr-1" />{data.phone}</p>
            </div>
            {data.location && <div className='flex text-slate-500 justify-center'>
                <p><MapPinIcon className="inline-block w-5 h-5 mr-1" />{data.location}</p>
            </div>}
            {/* TODO: Make it like a social links to genralise suppose in case of developer github but in case of content instagram */}
            <div className='flex text-slate-500 justify-center'>
                {data.linkedin && <p><LinkIcon className="inline-block w-5 h-5 mr-1" /> {data.linkedin}</p>}
            </div>
        </div>
        {data?.summary && <section className="summary-section">
            <div className='text-2xl text-stone-950 font-semibold my-2'>Professional Summary</div>
            <p>{data?.summary}</p>
        </section>}

        <div className='grid grid-cols-3'>
            <div className='border-r-2 border-slate-300 col-span-1'>
                <div className="border-b-1 border-slate-300 p-2">
                    <div className='text-2xl text-stone-950 font-semibold my-2 font-sans'>Education</div>
                    {data.education.map((edu: any, index: number) => (
                        <div key={index} className="flex flex-col mb-2">
                            <div className='font-serif'>
                                <div className="text-xl text-stone-800">{edu.degree}</div>
                                <p className="text-sm text-gray-450 mb-1">{edu.school} | {edu.year}</p>
                            </div>
                            {/* {edu.description && <div className='text-base font-sans'>
                                <ul className='list-disc ml-4'>
                                    {edu.description.map((resp: string, respIndex: number) => (
                                        <li className='mt-1/2' key={respIndex}>{resp}</li>
                                    ))}
                                </ul>
                            </div>} */}
                        </div>


                    ))}
                </div>

                <div className="skills-section">
                    <div className='text-2xl text-stone-950 font-semibold my-2 font-sans'>Skills</div>
                    <div className="flex flex-row flex-wrap text-base font-sans">
                        {data.skills.map((skill: string, index: number) => (
                            <div key={index}>{skill},&nbsp;</div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="border-b-1 border-slate-300 p-2 col-span-2">
                <div className='text-2xl text-stone-950 font-semibold my-2 font-sans'>Work Experience</div>
                {data.experience.map((job: any, index: number) => (
                    <div key={index} className="flex flex-col mb-2">
                        <div className='font-serif'>
                            <div className="text-xl text-stone-800">{job.title}</div>
                            <p className="text-sm text-gray-450 mb-1">{job.company} | {job.duration}</p>
                        </div>
                        {job.responsibilities && <div className='text-base font-sans'>
                            <ul className='list-disc ml-4'>
                                {job.responsibilities.map((resp: string, respIndex: number) => (
                                    <li className='mt-1/2' key={respIndex}>{resp}</li>
                                ))}
                            </ul>
                        </div>}
                    </div>
                ))}
            </div>
        </div>




    </>;
}   