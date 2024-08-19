import express, { Request, Response } from 'express';
import { postJobTitle, getAllJobTitles } from '../controllers/occupationController';

const router = express.Router();

// Route to handle posting a job title
router.post('/occupation', async (req: Request, res: Response) => {
    try {
        const { jobTitle } = req.body;
        if (!jobTitle) {
            return res.status(400).json({ message: 'Job title is required' });
        }

        const occupation = await postJobTitle(jobTitle);
        return res.status(201).json(occupation);
    } catch (error) {
        return res.status(500).json({ message: 'Internal server error', error });
    }
});

router.get('/occupations', async (req: Request, res: Response) => {
    try {
        const jobTitles = await getAllJobTitles();
        return res.status(200).json(jobTitles);
    } catch (error) {
        return res.status(500).json({ message: 'Internal server error', error });
    }
});

module.exports = router;
