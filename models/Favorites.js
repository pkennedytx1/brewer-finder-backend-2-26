import mongoose from "mongoose";

const favoriteSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        breweryId: {
            type: String,
            required: true
        }
    },
    { timestamps: true }
)

favoriteSchema.index({ 
        userId: 1,
        breweryId: 1
    },
    {
        unique: true
    }
)

export default mongoose.model('Favorite', favoriteSchema)