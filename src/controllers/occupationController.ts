import Occupation, { IOccupation } from "../models/occupation";

// Function to post a job title
export const postJobTitle = async (jobTitle: string): Promise<IOccupation> => {
    const newOccupation = new Occupation({ jobTitle });
    return newOccupation.save();
};

export const getAllJobTitles = async (): Promise<IOccupation[]> => {
    return Occupation.find({}, { jobTitle: 1, _id: 0 });
};