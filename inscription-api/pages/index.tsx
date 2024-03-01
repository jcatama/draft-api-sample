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
    const [isCreatingOrder, setIsCreatingOrder] = useState(false);
    const [finalStep, setFinalStep] = useState(false);
    const [gas, setGas]: any = useState(null);
    const [gasOpt, setGasOpt]: any = useState(0);
    const [order, setOrder]: any = useState(null);
    const [inscriptionContentSize, setInscriptionContentSize]: any = useState(0)
    const [mintPreview, setMintPreview]: any = useState(null)
    const [paymentStatus, setPaymentStatus] = useState(false);
    const [selectedImage, setSelectedImage]: any = useState();
    const [fees, setFees] = useState({ normal_fee_rate: 2, high_fee_rate: 2, fastest_fee_rate: 2 });
    const isDev: boolean = process.env.NODE_ENV == 'development' || process.env.NEXT_PUBLIC_FORCE_DEV == '1';

    const imageChange = (e: any) => {
        setGasOpt(0);
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0]
            setSelectedImage(file);
            setInscriptionContentSize(file.size / 1000)
        }
    };

    const removeSelectedImage = () => {
        setGasOpt(0);
        setMintPreview(null);
        setSelectedImage();
    };

    const getUploadedImage = () => {
        if (!selectedImage) return ''
        return URL.createObjectURL(selectedImage)
    }

    const estimateInscriptionCost = async () => {
        const formData = new FormData();
        formData.append('file', selectedImage);
        formData.append('inscription_postage_sats_amount', '1000');
        const preview = await fetch(`${process.env.NEXT_PUBLIC_GAMMA_API_ROOT}/inscription/v1/preview`, {
            headers: {
                "x-api-key": process.env.NEXT_PUBLIC_GAMMA_API_KEY as string
            },
            method: 'POST',
            body: formData

        })
            .then((response) => response.json())
            .then((data) => data);

        if (preview) setMintPreview(preview)
    }

    const mint = async () => {
        if (!gas) {
            alert('Please select a fee.');
            return;
        }

        if (!mintPreview) {
            alert('Unable to proceed. Missing mint quotation.');
            return;
        }

        await createOrder();
    };

    const createOrder = async () => {
        setIsCreatingOrder(true);
        try {

            let formData = new FormData();
            formData.append("btc_ordinal_recipient_address", session.user.ord);
            formData.append("btc_refund_recipient_address", session.user.pay);
            formData.append("expected_total_fee_sats", mintPreview['calculated_fee_summary'][gasOpt].total_fee_sats);
            formData.append("inscription_postage_sats_amount", "1000");
            formData.append("network_fee_rate", gas);
            formData.append('file', selectedImage);
            formData.append("keep_high_res", "false");

            const mintRequest = await fetch(`${process.env.NEXT_PUBLIC_GAMMA_API_ROOT}/inscription/v1/requests`, {
                method: 'POST',
                headers: {
                    "x-api-key": process.env.NEXT_PUBLIC_GAMMA_API_KEY as string
                },
                body: formData
            })
                .then((response) => response.json())
                .then((data) => data);
            if (mintRequest) {
                setOrder(mintRequest);
                setFinalStep(true);
            }
        } catch (e) {
            console.error(e);
            alert("Unable to mint");
        }
        setIsCreatingOrder(false);
    };

    const pay = async () => {
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
                onCancel: () => { },
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
                const prices = await fetch(
                    `${process.env.NEXT_PUBLIC_GAMMA_API_ROOT}/inscription/v1/network_fee_rates`,
                    {
                        headers: {
                            "Content-Type": 'application/json' as string,
                            "x-api-key": process.env.NEXT_PUBLIC_GAMMA_API_KEY as string,
                        }
                    }
                );
                const priceData = await prices.json();
                if (priceData) setFees(priceData);
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
                        Inscription Mint Sample App
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
                            <div className="col-span-12 text-center">

                                <>
                                    <div className="container flex flex-col justify-center items-center">
                                        {selectedImage ? (
                                            <>
                                                <div className="preview mt-50 mb-2 flex flex-col">
                                                    <img className="image m-2" src={getUploadedImage()} alt="upload" />
                                                    <button onClick={removeSelectedImage} className="delete cursor-pointer px-5 py-2 bg-red-500 text-white rounded-md shadow-sm hover:bg-red-600 focus:outline-none focus:bg-red-600">Remove This Image</button>
                                                </div>
                                                File size: {inscriptionContentSize} KB
                                                <select
                                                    id="gasfee"
                                                    value={gasOpt}
                                                    onChange={(e) => {
                                                        setGasOpt(e.target.value);
                                                        if (e.target.value == 'normal') {
                                                            setGas(fees.normal_fee_rate);
                                                        } else if (e.target.value == 'high') {
                                                            setGas(fees.high_fee_rate);
                                                        } else if (
                                                            e.target.value == 'fastest'
                                                        ) {
                                                            setGas(fees.fastest_fee_rate);
                                                        } else {
                                                            setGas(0);
                                                        }
                                                        estimateInscriptionCost()
                                                    }}
                                                    className="block w-[320px] my-5 m-auto p-4 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:border-gray-200 text-lg"
                                                >
                                                    <option value="0" className="py-2">
                                                        Select Inscription Fee
                                                    </option>
                                                    <option className="py-2" value="normal">
                                                        {fees.normal_fee_rate} sat/vB
                                                    </option>
                                                    <option className="py-2" value="high">
                                                        {fees.high_fee_rate} sat/vB
                                                    </option>
                                                    <option className="py-2" value="fastest">
                                                        {fees.fastest_fee_rate} sat/vB
                                                    </option>
                                                </select>
                                            </>
                                        ) : (
                                            <input
                                                accept="image/*"
                                                type="file"
                                                onChange={imageChange}
                                                className='text-center w-[250px]'
                                            />
                                        )}
                                    </div>
                                </>
                                {mintPreview ? (
                                    <>
                                        <div className="preview mt-50 mb-2 flex flex-col">
                                            Inscription Preview:
                                            <img className="image m-2" src={mintPreview.output_base64} alt="upload" />
                                        </div>
                                        <button
                                            type="submit"
                                            className="text-2xl px-5 py-2 bg-blue-500 text-white rounded-md shadow-sm hover:bg-blue-600 focus:outline-none focus:bg-blue-600"
                                            onClick={mint}
                                        >
                                            {isCreatingOrder ? (
                                                <Spinner></Spinner>
                                            ) : (
                                                'MINT'
                                            )}
                                        </button>
                                    </>
                                ) : ""}
                            </div>
                            <div className="mt-10 col-span-12 text-center">
                                <Link
                                    className="border-2 font-medium px-9 py-[10.5px] text-md rounded-lg"
                                    target="_blank"
                                    href={`${process.env.NEXT_PUBLIC_GAMMA_PAGE}/ordinals/status`}
                                >
                                    View Orders
                                </Link>
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
