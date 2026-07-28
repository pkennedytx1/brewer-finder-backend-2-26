import express from 'express'
import { protect } from '../middleware/auth.js'
import Favorite from '../models/Favorites.js'

const router = express.Router()

/**
 * @openapi
 * /api/favorites/me:
 *   get:
 *     summary: List favorites for the logged-in user
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of favorite documents
 *       401:
 *         description: No token or invalid token
 */
router.get('/me', protect, async (req, res) => {
    const favs = await Favorite.find({ userId: req.user.id })
    res.json(favs)
})

/**
 * @openapi
 * /api/favorites:
 *   post:
 *     summary: Save a brewery as a favorite
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [breweryId]
 *             properties:
 *               breweryId:
 *                 type: string
 *                 example: b58f8e
 *     responses:
 *       201:
 *         description: Favorite created
 *       401:
 *         description: No token or invalid token
 *       409:
 *         description: Already favorited
 */
router.post('/', protect, async (req, res) => {
    try {
        const fav = await Favorite.create({
            userId: req.user.id,
            breweryId: req.body.breweryId
        })
        res.status(201).json(fav)
    } catch (e) {
        if (e.code === 11000) {
            return res.status(409).json({ message: 'Already a favorite' })
        }
        console.error(e)
        res.status(500).json({ message: 'Failed to save favorite' })
    }
})

/**
 * @openapi
 * /api/favorites/{id}:
 *   delete:
 *     summary: Remove a saved favorite
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Favorite document _id
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Removed
 *       401:
 *         description: No token or invalid token
 *       404:
 *         description: Favorite not found
 */
router.delete("/:id", protect, async (req, res) => {
    const deleted = await Favorite.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id, // own it — don't delete someone else's
    });
  
    if (!deleted) {
      return res.status(404).json({ message: "Favorite not found" });
    }
  
    res.json({ message: "Removed" });
  });

export default router