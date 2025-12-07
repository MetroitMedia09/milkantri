import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDistribution extends Document {
  distributor: mongoose.Types.ObjectId;
  product: mongoose.Types.ObjectId;
  allotment: mongoose.Types.ObjectId;
  recipientName: string;
  quantity: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DistributionSchema = new Schema<IDistribution>(
  {
    distributor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    allotment: {
      type: Schema.Types.ObjectId,
      ref: 'Allotment',
      required: true,
    },
    recipientName: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Distribution: Model<IDistribution> =
  mongoose.models.Distribution || mongoose.model<IDistribution>('Distribution', DistributionSchema);

export default Distribution;
