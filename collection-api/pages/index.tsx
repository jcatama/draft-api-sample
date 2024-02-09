'use client';

import { useState, useEffect } from 'react';
import { Rubik } from 'next/font/google';
import WalletConnect from '@/components/WalletConnect';
import { BitcoinNetworkType, sendBtcTransaction } from 'sats-connect';
import { useSession } from 'next-auth/react';
import Spinner from '@/components/Spinner';
import Link from 'next/link';
import Image from 'next/image';
const rubik = Rubik({
    weight: ['300', '400', '600'],
    style: ['normal', 'italic'],
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-rubik',
});

export default function Home() {
    const { data: session, status }: any = useSession();
    const [isLoading, setIsLoading] = useState(false);
    const [isCreatingOrder, setIsCreatingOrder] = useState(false);
    const [finalStep, setFinalStep] = useState(false);
    const [isEligible, setIsEligible] = useState(false);
    const [gas, setGas]: any = useState(null);
    const [gasOpt, setGasOpt]: any = useState(0);
    const [order, setOrder]: any = useState(null);
    const [paymentStatus, setPaymentStatus] = useState(false);
    const isDev: boolean = process.env.NODE_ENV == 'development';

    const [collection, setCollection] = useState({
        mint_stage: 'DISABLED',
        available: 0,
        in_progress: 0,
        minted: 0,
        total_supply: 0,
        mintprice: 0,
    });

    const [fees, setFees] = useState({
        mint_price_sats: 0,
        normal: {
            inscription_postage_sats: 0,
            gamma_service_fee_sats: 0,
            network_fee_sats: 0,
            total_fee_sats: 0,
            network_fee_rate: 0,
        },
        high: {
            inscription_postage_sats: 0,
            gamma_service_fee_sats: 0,
            network_fee_sats: 0,
            total_fee_sats: 0,
            network_fee_rate: 0,
        },
        fastest: {
            inscription_postage_sats: 0,
            gamma_service_fee_sats: 0,
            network_fee_sats: 0,
            total_fee_sats: 0,
            network_fee_rate: 0,
        },
    });

    const [mintpass, setMintpass] = useState({
        address: null,
        address_type: null,
        allocated: 0,
        remaining: 0,
    });

    const mint = async () => {
        if (!gas) {
            alert('Please select a fee.');
            return;
        }

        if (collection.available < 0) {
            alert('No longer available');
            return;
        }

        if (collection.mint_stage == 'DISABLED') {
            alert('Mint is currently disable');
            return;
        }

        if (
            collection.mint_stage == 'PRESALE' &&
            (mintpass?.address != session?.user?.ord || mintpass?.remaining < 0)
        ) {
            alert('You are not allowed to mint.');
            return;
        }

        await createOrder();
    };

    const createOrder = async () => {
        setIsCreatingOrder(true);
        const errorMint =
            'Unable to mint: The mintpass is missing, or the collection is not available for minting';
        try {
            const mintRequest = await fetch('api/mint', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    network_fee_rate: gas.network_fee_rate,
                }),
            })
                .then((response) => response.json())
                .then((data) => data);
            if (mintRequest) {
                setOrder(mintRequest);
                setFinalStep(true);
            }
        } catch (e) {
            console.error(e);
            alert(errorMint);
        }
        setIsCreatingOrder(false);
    };

    const pay = async () => {
        if (!isEligible || !session || !order) {
            alert('Not Allowed');
            return;
        }

        if (order.is_paid_for) {
            alert(
                `Payment has already been made for this address: ${order.btc_deposit_address}`
            );
            return;
        }

        const wallet = session?.user?.wallet;
        const gammaPaymentAddress = order.btc_deposit_address;
        const gammaPaymentAmount = order.total_request_fee_sats;

        if (wallet == 'leather') {
            const paymentResponse = await window.btc?.request('sendTransfer', {
                network: isDev ? 'testnet' : 'mainnet',
                address: gammaPaymentAddress,
                amount: gammaPaymentAmount,
            });

            if (paymentResponse) {
                console.log(paymentResponse);
                setPaymentStatus(true);
            } else {
                console.log(paymentResponse);
                alert('Payment error');
            }
        } else if (wallet == 'xverse') {
            await sendBtcTransaction({
                payload: {
                    network: {
                        type: (isDev
                            ? 'Testnet'
                            : 'Mainnet') as BitcoinNetworkType,
                    },
                    recipients: [
                        {
                            address: gammaPaymentAddress,
                            amountSats: BigInt(gammaPaymentAmount),
                        },
                    ],
                    senderAddress: session.user.pay,
                },
                onFinish: (response) => {
                    if (response) {
                        console.log(response);
                        setPaymentStatus(true);
                    } else {
                        console.log(response);
                        alert('Payment error');
                    }
                },
                onCancel: () => {},
            });
        } else if (wallet == 'unisat') {
            try {
                let txid = await window.unisat.sendBitcoin(
                    gammaPaymentAddress,
                    gammaPaymentAmount
                );
                if (txid) {
                    console.log(txid);
                    setPaymentStatus(true);
                } else {
                    console.log(txid);
                    alert('Payment error');
                }
            } catch (e) {
                console.log(e);
            }
        }
    };

    useEffect(() => {
        (async () => {
            if (session) {
                setIsLoading(true);
                const collectionResponse = await fetch('api/collection').then(
                    (response) => response.json()
                );

                setCollection(collectionResponse);

                if (collectionResponse.mint_stage == 'PRESALE' && session) {
                    setIsEligible(false);
                    setIsLoading(true);
                    const passes = await fetch(
                        `api/pass?ord=${session.user.ord}`
                    ).then((response) => response.json());
                    if (passes) {
                        if (passes.remaining > 0) {
                            setIsEligible(true);
                        }
                        setMintpass(passes);
                    }
                    setIsLoading(false);
                }

                const feesResponse = await fetch('api/fees').then((response) =>
                    response.json()
                );
                setFees(feesResponse);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session]);

    return (
        <main
            className={`flex min-h-screen flex-col items-center justify-between p-24 ${rubik.className}`}
        >
            <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
                <p className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto  lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
                    <code className="font-mono font-bold">
                        Collection Mint Sample App
                    </code>
                </p>
                <div className="fixed bottom-0 left-0 flex h-48 w-full items-end justify-center bg-gradient-to-t from-white via-white dark:from-black dark:via-black lg:static lg:h-auto lg:w-auto lg:bg-none">
                    <a
                        className="pointer-events-none flex place-items-center gap-2 p-8 lg:pointer-events-auto lg:p-0"
                        href="https://gamma.io"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        By{' '}
                        <Image
                            src="/gamma.png"
                            alt="Gamma Logo"
                            className="dark:invert"
                            width={180}
                            height={68}
                            priority
                        />
                    </a>
                </div>
            </div>
            <div className="relative place-items-center max-w-[590px]">
                {
                    // Step 1: Mint submission
                }
                {session && !finalStep ? (
                    <>
                        <div className="2xl:grid mx-auto gap-12 2xl:grid-cols-12 border rounded-md border-gray-300 bg-gray-100 px-10 py-10">
                            <div className="mr-auto place-self-center col-span-6 text-center">
                                <h1 className="text-2xl font-bold my-5">
                                    {
                                        process.env
                                            .NEXT_PUBLIC_GAMMA_COLLECTION_NAME
                                    }
                                </h1>
                                <p className="my-5 text-md leading-none text-center break-all">
                                    Price:{' '}
                                    <span className="font-light">
                                        {collection.mintprice / 100000000} BTC
                                    </span>
                                </p>
                                <p className="my-5 text-md leading-none text-center break-all font-bold">
                                    {collection.available} /{' '}
                                    <span className="font-bold">
                                        {collection.total_supply}
                                    </span>
                                </p>
                                <p className="my-5 text-md leading-none text-center break-all">
                                    In Progress:{' '}
                                    <span className="font-light">
                                        {collection.in_progress}
                                    </span>
                                </p>
                            </div>
                            <div className="2xl:mt-0 col-span-6 text-center">
                                <p className="mt-4 mb-4 text-md leading-none text-center break-all">
                                    <span className="font-bold text-lg">
                                        <Link
                                            className="hover:text-blue-400 hover:underline"
                                            target="_blank"
                                            href={`https://gamma.io/${session?.user?.ord}`}
                                        >
                                            View Profile
                                        </Link>
                                    </span>
                                </p>
                                {isLoading ? (
                                    <Spinner></Spinner>
                                ) : (
                                    <>
                                        <p className="my-4 text-lg leading-none text-center break-all">
                                            {collection.mint_stage != 'DISABLED'
                                                ? collection.mint_stage
                                                : 'PAUSED'}
                                        </p>
                                        <p className="my-4 text-sm leading-none text-center break-all">
                                            {isEligible &&
                                            collection.mint_stage == 'PRESALE'
                                                ? `Mintpass: ${mintpass.remaining} / ${mintpass.allocated}`
                                                : ''}
                                        </p>
                                    </>
                                )}
                                <br />
                                <Link
                                    className="border-2 font-medium px-9 py-[10.5px] text-md rounded-lg"
                                    target="_blank"
                                    href={`${process.env.NEXT_PUBLIC_GAMMA_PAGE}/ordinals?ordinal_recipient_address=${session?.user?.ord}&collection_id=${process.env.NEXT_PUBLIC_GAMMA_COLLECTION_ID}`}
                                >
                                    View Orders
                                </Link>
                            </div>
                            <div className="col-span-12 text-center">
                                <select
                                    id="gasfee"
                                    value={gasOpt}
                                    onChange={(e) => {
                                        setGasOpt(e.target.value);
                                        if (e.target.value == 'normal') {
                                            setGas(fees.normal);
                                        } else if (e.target.value == 'high') {
                                            setGas(fees.high);
                                        } else if (
                                            e.target.value == 'fastest'
                                        ) {
                                            setGas(fees.fastest);
                                        } else {
                                            setGas(0);
                                        }
                                    }}
                                    className="block w-[320px] m-auto p-4 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:border-gray-200 text-lg"
                                >
                                    <option value="0" className="py-2">
                                        Select Inscription Fee
                                    </option>
                                    <option className="py-2" value="normal">
                                        {fees.normal?.network_fee_rate} sat/vB
                                    </option>
                                    <option className="py-2" value="high">
                                        {fees.high?.network_fee_rate} sat/vB
                                    </option>
                                    <option className="py-2" value="fastest">
                                        {fees.fastest?.network_fee_rate} sat/vB
                                    </option>
                                </select>
                                {gas ? (
                                    <div>
                                        <span className="block font-bold pt-5 text-lg">
                                            Breakdown:
                                        </span>
                                        <span className="block py-2">
                                            Network Fee Rate:{' '}
                                            {gas.network_fee_rate} sat/vB
                                        </span>
                                        <span className="blok py-2">
                                            Network Fee: {gas.network_fee_sats}{' '}
                                            Sats
                                        </span>
                                        <span className="block py-2">
                                            Gamma Service Fee:{' '}
                                            {gas.gamma_service_fee_sats} Sats{' '}
                                        </span>
                                        <span className="block py-2">
                                            Inscription Postage:{' '}
                                            {gas.inscription_postage_sats} Sats
                                        </span>
                                        <span className="block py-2 font-bold underline mb-5">
                                            Total Mint Cost:{' '}
                                            {gas.total_fee_sats} Sats
                                        </span>
                                        <span className="block py-2 text-xs font-bold">
                                            Your ordinal receving address:
                                            <br />
                                            <span className="font-light">
                                                {session.user.ord}
                                            </span>
                                        </span>
                                        <span className="block py-2 text-xs font-bold">
                                            Your bitcoin refund address:
                                            <br />
                                            <span className="font-light">
                                                {session.user.pay}
                                            </span>
                                        </span>
                                    </div>
                                ) : (
                                    ''
                                )}
                                <button
                                    type="submit"
                                    className="text-2xl mt-4 px-5 py-2 bg-blue-500 text-white rounded-md shadow-sm hover:bg-blue-600 focus:outline-none focus:bg-blue-600"
                                    onClick={mint}
                                >
                                    {isCreatingOrder ? (
                                        <Spinner></Spinner>
                                    ) : (
                                        'MINT'
                                    )}
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    ''
                )}

                {
                    // Step 2: Payment via wallet or manual by external wallet
                }
                {session && finalStep ? (
                    <>
                        <div className="border rounded-md border-gray-300 bg-gray-100 px-10 py-10 w-[600px]">
                            {!paymentStatus ? (
                                <>
                                    <div className="mb-7 mr-auto place-self-center text-center">
                                        <button
                                            onClick={pay}
                                            className="text-center font-bold text-xl px-5 py-2 bg-blue-500 text-white rounded-md shadow-sm hover:bg-blue-600 focus:outline-none focus:bg-blue-600"
                                        >
                                            Pay with wallet
                                        </button>
                                    </div>
                                    <hr />
                                    <div className="mt-5 mr-auto place-self-centertext-center">
                                        <p className="text-center font-bold text-2xl">
                                            Pay manual
                                        </p>
                                        <p className="text-center font-medium mt-5">
                                            Payment Address
                                        </p>
                                        <p className="p-4 my-4 text-md leading-none text-gray text-center break-all border rounded-lg border-gray-200 hover:bg-white">
                                            {order?.btc_deposit_address}
                                        </p>
                                        <p className="text-center font-medium">
                                            Payment Amount in BTC
                                        </p>
                                        <p className="p-4 my-4 text-md leading-none text-gray text-center break-all border rounded-lg border-gray-200 hover:bg-white ">
                                            {order?.total_request_fee_sats /
                                                100000000}
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="mr-auto place-self-center text-center">
                                        <p className="text-center font-bold text-2xl mb-5">
                                            Payment Sucess!
                                        </p>
                                        <Link
                                            href={`${process.env.NEXT_PUBLIC_GAMMA_PAGE}/ordinals?address=${order?.btc_deposit_address}`}
                                            target="_blank"
                                            className="text-center font-bold text-xl px-5 py-2 bg-blue-500 text-white rounded-md shadow-sm hover:bg-blue-600 focus:outline-none focus:bg-blue-600"
                                        >
                                            View Order
                                        </Link>
                                    </div>
                                </>
                            )}
                        </div>
                    </>
                ) : (
                    ''
                )}
                <WalletConnect></WalletConnect>
            </div>
            <div className="mb-32 grid text-center lg:max-w-5xl lg:w-full lg:mb-0 lg:grid-cols-4 lg:text-left"></div>
        </main>
    );
}
