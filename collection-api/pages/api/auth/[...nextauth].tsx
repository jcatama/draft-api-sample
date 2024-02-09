import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions: any = {
    providers: [
        CredentialsProvider({
            name: 'Bitcoin',
            credentials: {},
            async authorize(credentials: any, req): Promise<any | null> {
                // Custom anonymous session
                if (
                    credentials.connectType == null ||
                    credentials.connectedOrdinalAddress == null ||
                    credentials.connectedBitcoinAddress == null
                )
                    return null;

                return {
                    wallet: credentials.connectType,
                    ord: credentials.connectedOrdinalAddress,
                    pay: credentials.connectedBitcoinAddress,
                };
            },
        }),
    ],
    session: {
        strategy: 'jwt',
    },
    secret: process.env.NEXTAUTH_SECRET,
    callbacks: {
        async session({ session, token }: any) {
            session.user = token.user;
            return session;
        },
        async jwt({ token, user }: any) {
            if (user) {
                token.user = user;
            }
            return token;
        },
    },
};

const handler = NextAuth(authOptions);

export default handler;
