import React from 'react';
import { getAddress, signMessage } from 'sats-connect';
import { useSession, signIn, signOut } from 'next-auth/react';
import Spinner from '@/components/Spinner';
import Image from 'next/image';

declare global {
    interface Window {
        LeatherProvider: any;
        unisat: any;
        btc: any;
    }
}

const isDev: boolean = process.env.NODE_ENV == 'development';

const signMsg = `Sign this message to validate your wallet\nDomain: test.com\nBlockchain: Bitcoin`;

const walletConnectClass: string =
    'inline-flex text-gray-900 bg-gray-100 hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-gray-100 font-medium rounded-lg text-2xl px-5 py-2.5 text-center items-center dark:focus:ring-gray-500 me-2 mb-4 w-[300px]';

const ConnectButtonOrd = ({}) => {
    const { data: session, status } = useSession();

    const connectWalletLeather = async (): Promise<void> => {
        if (typeof window.LeatherProvider === 'undefined') {
            alert('Leather wallet is not active');
            return;
        }

        const userAddresses = await window.btc?.request('getAddresses');

        let credentials: any = {
            connectType: 'leather',
            connectedOrdinalAddress: '',
            connectedBitcoinAddress: '',
            redirect: false,
            callbackUrl: '/mint',
        };

        userAddresses.result.addresses.forEach((addr: any) => {
            if (addr.type == 'p2wpkh')
                credentials['connectedBitcoinAddress'] = addr.address;

            if (addr.type == 'p2tr')
                credentials['connectedOrdinalAddress'] = addr.address;
        });

        const response = await window.btc.request('signMessage', {
            message: signMsg,
            paymentType: 'p2tr',
        });

        if (response) await signIn('credentials', credentials);
    };

    const connectWalletXverse = async (): Promise<void> => {
        if (typeof window.XverseProviders === 'undefined') {
            alert('Xverse wallet is not active');
            return;
        }
        const getAddressOptions: any = {
            payload: {
                purposes: ['ordinals', 'payment'],
                message: 'Address for receiving Ordinals and payments',
                network: {
                    type: isDev ? 'Testnet' : 'Mainnet',
                },
            },
            onFinish: async (response: any) => {
                const taprootAddress = response.addresses.find(
                    (i: any) => i.purpose === 'ordinals'
                );
                const paymentAddress = response.addresses.find(
                    (i: any) => i.purpose === 'payment'
                );

                const signMessageOptions: any = {
                    payload: {
                        network: {
                            type: isDev ? 'Testnet' : 'Mainnet',
                        },
                        address: taprootAddress.address,
                        message: signMsg,
                    },
                    onFinish: async (sign: any) => {
                        if (sign) {
                            await signIn('credentials', {
                                connectType: 'xverse',
                                connectedOrdinalAddress: taprootAddress.address,
                                connectedBitcoinAddress: paymentAddress.address,
                                redirect: false,
                                callbackUrl: '/mint',
                            });
                        }
                    },
                    onCancel: () => alert('Canceled'),
                };
                await signMessage(signMessageOptions);
            },
            onCancel: () => alert('Authetication canceled'),
        };

        await getAddress(getAddressOptions);
    };

    const connectWalletUnisat = async (): Promise<void> => {
        if (typeof window.unisat === 'undefined') {
            alert('Unisat wallet is not active');
            return;
        }
        const net = isDev ? 'testnet' : 'livenet';
        await window.unisat.switchNetwork(net);
        const accounts = await window.unisat.requestAccounts();

        let unisatSign = await window.unisat.signMessage(
            signMsg,
            'bip322-simple'
        );
        if (unisatSign) {
            await signIn('credentials', {
                connectType: 'unisat',
                connectedOrdinalAddress: accounts[0],
                connectedBitcoinAddress: accounts[0],
                redirect: false,
                callbackUrl: '/mint',
            });
        }
    };

    return (
        <div>
            {status == 'loading' ? (
                <Spinner></Spinner>
            ) : session == null ? (
                <>
                    <div>
                        <button
                            type="button"
                            className={walletConnectClass}
                            onClick={connectWalletLeather}
                        >
                            <Image
                                src="/leather.png"
                                alt="Leather Logo"
                                className="dark:invert mr-3"
                                width={70}
                                height={70}
                                priority
                            />
                            Leather Wallet
                        </button>
                    </div>
                    <div>
                        <button
                            type="button"
                            className={walletConnectClass}
                            onClick={connectWalletXverse}
                        >
                            <Image
                                src="/xverse.png"
                                alt="Xverse Logo"
                                className="dark:invert mr-3"
                                width={70}
                                height={70}
                                priority
                            />
                            Xverse Wallet
                        </button>
                    </div>
                    <div>
                        <button
                            type="button"
                            className={walletConnectClass}
                            onClick={connectWalletUnisat}
                        >
                            <Image
                                src="/unisat.png"
                                alt="Unisat Logo"
                                className="dark:invert mr-3"
                                width={70}
                                height={70}
                                priority
                            />
                            Unisat Wallet
                        </button>
                    </div>
                </>
            ) : (
                <div className="text-center">
                    <button
                        type="button"
                        className={
                            walletConnectClass +
                            ' block m-auto ml-6 mt-5 bg-white text-lg font-bold text-cente w-auto'
                        }
                        onClick={() => signOut()}
                    >
                        DISCONNECT
                    </button>
                </div>
            )}
        </div>
    );
};

export default ConnectButtonOrd;
