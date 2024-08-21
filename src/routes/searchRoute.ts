import express from 'express';
import { getGroupsByAdmin, getGroupsByIdea, searchIdeasByHeadline } from '../controllers/searchController';

const router = express.Router();

// Define the route for getting groups by admin
router.get('/groups-by-admin', getGroupsByAdmin);
router.get('/groups-by-idea', getGroupsByIdea);
router.get('/search', searchIdeasByHeadline);

module.exports = router;