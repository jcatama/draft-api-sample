import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

const headers = {
    headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.GAMMA_API_KEY as string,
    },
};

const collectionApi = `${process.env.NEXT_PUBLIC_GAMMA_API_ROOT}/inscription/v1/collections/${process.env.NEXT_PUBLIC_GAMMA_COLLECTION_ID}`;

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method === 'GET') {
        try {
            const session = await getServerSession(req, res, authOptions);
            if (session) {
                const prices = await fetch(
                    `${collectionApi}/inscription_price_summary`,
                    headers
                );
                const priceData = await prices.json();

                res.status(200).json(priceData);
            } else {
                res.status(401).json({ error: 'Unauthorized' });
            }
        } catch (error) {
            console.log(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    } else {
        res.status(405).json({ error: 'Method Not Allowed' });
    }
}
