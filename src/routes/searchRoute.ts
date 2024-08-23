import express from 'express';
import { getGroupsByAdmin, getGroupsByIdea, searchIdeasByHeadline, fetchActiveIdeasByCategory, fetchTopIdeasByLikes, fetchTopIdeasByViews} from '../controllers/searchController';

const router = express.Router();

// Define the route for getting groups by admin
router.get('/groups-by-admin', getGroupsByAdmin);
router.get('/groups-by-idea', getGroupsByIdea);
router.get('/search', searchIdeasByHeadline);
router.get('/category', fetchActiveIdeasByCategory);
router.get('/likes', fetchTopIdeasByLikes);
router.get('/views', fetchTopIdeasByViews);

module.exports = router;