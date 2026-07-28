import express from 'express'

const router = express.Router()
const OBDB_URL = 'https://api.openbrewerydb.org/v1/breweries'

/**
 * @openapi
 * /api/breweries:
 *   get:
 *     summary: Search breweries (proxies Open Brewery DB filters)
 *     tags: [Breweries]
 *     parameters:
 *       - in: query
 *         name: by_city
 *         schema:
 *           type: string
 *         example: austin
 *       - in: query
 *         name: by_name
 *         schema:
 *           type: string
 *       - in: query
 *         name: by_state
 *         schema:
 *           type: string
 *         example: texas
 *       - in: query
 *         name: by_type
 *         schema:
 *           type: string
 *           enum: [micro, nano, regional, brewpub, large, taproom]
 *     responses:
 *       200:
 *         description: Array of brewery objects
 *       400:
 *         description: At least one search filter is required
 *       500:
 *         description: Failed to fetch breweries
 */
router.get("/", async (req, res) => {
    try {
        // Same keys the React app sets in BrewerySearchWrapper via URLSearchParams
        const allowed = ["by_city", "by_name", "by_state", "by_type"]
        const params = new URLSearchParams()

        for (const key of allowed) {
            const value = req.query[key]
            if (value) params.set(key, value)
        }

        if ([...params.keys()].length === 0) {
            return res.status(400).json({
                message: "At least one of by_city, by_name, by_state, or by_type is required",
            })
        }

        const url = `${OBDB_URL}?${params.toString()}`
        console.log("Querying for breweries from OBDB 🍺", url)

        const response = await fetch(url)
        if (!response.ok) {
            throw new Error(`Open Brewery DB responded ${response.status}`)
        }

        const data = await response.json()
        res.json(data)
    } catch (e) {
        console.error(e)
        res.status(500).json({ message: "Failed to fetch breweries" })
    }
})

/**
 * @openapi
 * /api/breweries/{id}:
 *   get:
 *     summary: Get a single brewery by Open Brewery DB id
 *     tags: [Breweries]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Brewery object
 *       404:
 *         description: Brewery not found
 *       500:
 *         description: Failed to fetch brewery
 */
router.get("/:id", async (req, res) => {
    try {
        const url = `${OBDB_URL}/${req.params.id}`
        console.log("Proxying →", url)

        const response = await fetch(url)
        if (!response.ok) {
            return res.status(response.status).json({ message: "Brewery not found" })
        }

        const data = await response.json()
        res.json(data)
    } catch (err) {
        console.error(err)
        res.status(500).json({ message: "Failed to fetch brewery" })
    }
})

export default router