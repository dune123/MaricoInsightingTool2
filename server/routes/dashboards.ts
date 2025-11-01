import { Router } from "express";
import {
  addChartToDashboardController,
  createDashboardController,
  deleteDashboardController,
  listDashboardsController,
  removeChartFromDashboardController,
} from "../controllers/index.js";

const router = Router();

// Dashboards
router.post('/dashboards', createDashboardController);
router.get('/dashboards', listDashboardsController);
router.delete('/dashboards/:dashboardId', deleteDashboardController);

// Charts in a dashboard
router.post('/dashboards/:dashboardId/charts', addChartToDashboardController);
router.delete('/dashboards/:dashboardId/charts', removeChartFromDashboardController);

export default router;



