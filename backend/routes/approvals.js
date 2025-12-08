import express from 'express';
import User from '../models/User.js';
import ApprovalFlow from '../models/ApprovalFlow.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Create approval flow for a request
router.post('/', authenticate, authorize(['hr', 'admin']), async (req, res) => {
  const { requestType, requestId, requester, approvers } = req.body;

  try {
    const approvalFlow = new ApprovalFlow({
      requestType,
      requestId,
      requester,
      approvers: approvers.map((app, index) => ({
        approver: app,
        level: index + 1,
        status: 'pending',
      })),
      company: req.user.company,
    });

    const savedFlow = await approvalFlow.save();
    await savedFlow.populate([
      { path: 'requester', select: 'firstName lastName' },
      { path: 'approvers.approver', select: 'firstName lastName' },
    ]);

    res.status(201).json(savedFlow);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get all approval flows for a company
router.get('/', authenticate, async (req, res) => {
  try {
    const flows = await ApprovalFlow.find({ company: req.user.company })
      .populate([
        { path: 'requester', select: 'firstName lastName' },
        { path: 'approvers.approver', select: 'firstName lastName' },
      ])
      .sort({ createdAt: -1 });

    res.json(flows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get pending approvals for current user
router.get('/pending/me', authenticate, async (req, res) => {
  try {
    const pendingFlows = await ApprovalFlow.find({
      'approvers.approver': req.user._id,
      'approvers.status': 'pending',
      company: req.user.company,
    })
      .populate([
        { path: 'requester', select: 'firstName lastName email' },
        { path: 'approvers.approver', select: 'firstName lastName' },
      ])
      .sort({ createdAt: -1 });

    res.json(pendingFlows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Approve/reject at current level
router.put('/:id/approve', authenticate, async (req, res) => {
  const { status, comment } = req.body;

  try {
    const flow = await ApprovalFlow.findById(req.params.id);
    if (!flow) return res.status(404).json({ message: 'Approval flow not found' });

    // Find current approver level
    const currentApprovalIndex = flow.approvers.findIndex(
      (app) => app.approver.toString() === req.user._id.toString() && app.status === 'pending'
    );

    if (currentApprovalIndex === -1) {
      return res.status(403).json({ message: 'You are not an approver for this request' });
    }

    flow.approvers[currentApprovalIndex].status = status;
    flow.approvers[currentApprovalIndex].comment = comment;
    flow.approvers[currentApprovalIndex].approvedAt = new Date();

    if (status === 'approved') {
      // Check if all approvers at this level approved
      const nextLevelApprovers = flow.approvers.filter(
        (app) => app.level === flow.approvers[currentApprovalIndex].level
      );
      const allApproved = nextLevelApprovers.every((app) => app.status === 'approved');

      if (allApproved) {
        flow.currentLevel += 1;

        // Check if there are more levels
        const hasMoreLevels = flow.approvers.some(
          (app) => app.level === flow.currentLevel && app.status === 'pending'
        );

        if (!hasMoreLevels) {
          flow.status = 'approved';
        }
      }
    } else if (status === 'rejected') {
      flow.status = 'rejected';
    }

    const updatedFlow = await flow.save();
    await updatedFlow.populate([
      { path: 'requester', select: 'firstName lastName' },
      { path: 'approvers.approver', select: 'firstName lastName' },
    ]);

    res.json(updatedFlow);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
