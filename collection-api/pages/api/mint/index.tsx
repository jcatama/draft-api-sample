import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method === 'POST') {
        try {
            const session: any = await getServerSession(req, res, authOptions);
            const params: any = req.body;
            if (session) {
                let bodyContent = JSON.stringify({
                    collection_id: process.env.NEXT_PUBLIC_GAMMA_COLLECTION_ID,
                    btc_ordinal_recipient_address: session.user.ord,
                    btc_refund_recipient_address: session.user.pay,
                    network_fee_rate: params.network_fee_rate,
                });
                const mintRequest = await fetch(
                    `${process.env.NEXT_PUBLIC_GAMMA_API_ROOT}/inscription/v1/collection_mint_requests`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-api-key': process.env.GAMMA_API_KEY as string,
                        },
                        body: bodyContent,
                    }
                );
                if (mintRequest.status == 200 || mintRequest.status == 201) {
                    const request = await mintRequest.json();
                    return res.status(200).json(request);
                }
                res.status(500).json({ error: 'Internal Server Error' });
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
