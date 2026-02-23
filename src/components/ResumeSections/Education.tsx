import DateRange from "../app-components/DateRange"
import TextArea from "../app-components/TextArea"
import TextInput from "../app-components/TextInput"
import SectionTitle from "./SectionTitle"

export default function ResumeEducation({ education }: { education: any[] }) {
    return (
        <div className="flex flex-col">
            <SectionTitle title="Education" />
            {education.map((edu: any, index: number) => (
                <div key={index} className="flex flex-col mb-2">
                    <TextInput name="degree" label="Degree" value={edu.degree}/>
                    <TextInput name="school" label="School" value={edu.school} />
                    <DateRange name="year" start={edu.startDate} end={edu.endDate} />
                    <TextArea name="details" label="Details" value={edu.details} />
                </div>
            ))}
        </div>
    )
}