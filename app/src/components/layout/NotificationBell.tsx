"use client";

import React, { useState, useEffect, useRef } from "react";
import { Bell, Check, X, Info, CreditCard, Rocket } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    createdAt: string;
    isSeen: boolean;
}

export default function NotificationBell() {
    const { publicKey } = useWallet();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = async () => {
        if (!publicKey) return;
        try {
            const resp = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/notifications/${publicKey.toBase58()}`);
            const data = await resp.json();
            if (data.success) {
                setNotifications(data.notifications);
                setUnreadCount(data.notifications.filter((n: any) => !n.isSeen).length);
            }
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        }
    };

    const subscribeToPush = async () => {
        if (!publicKey || typeof window === "undefined" || !("serviceWorker" in navigator)) return;

        try {
            const registration = await navigator.serviceWorker.ready;

            // Check if already subscribed
            const existingSubscription = await registration.pushManager.getSubscription();
            if (existingSubscription) return;

            const permission = await Notification.requestPermission();
            if (permission !== "granted") return;

            const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            if (!vapidPublicKey) return;

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
            });

            await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/push/subscribe`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    publicKey: publicKey.toBase58(),
                    subscription
                })
            });

            console.log("Push subscription successful");
        } catch (error) {
            console.error("Failed to subscribe to push:", error);
        }
    };

    function urlBase64ToUint8Array(base64String: string) {
        const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    useEffect(() => {
        fetchNotifications();
        subscribeToPush();
        const interval = setInterval(fetchNotifications, 30000); // Polling every 30s
        return () => clearInterval(interval);
    }, [publicKey]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const getIcon = (type: string) => {
        switch (type) {
            case "CONTRIBUTION_DUE_NOW": return <CreditCard className="w-4 h-4 text-amber-400" />;
            case "PAYOUT_RECEIVED": return <Rocket className="w-4 h-4 text-green-400" />;
            default: return <Info className="w-4 h-4 text-purple-400" />;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-1.5 md:p-2 rounded-full hover:bg-white/5 transition-colors group"
            >
                <Bell className={`w-4 h-4 md:w-5 md:h-5 transition-colors ${unreadCount > 0 ? 'text-purple-400' : 'text-gray-400 group-hover:text-white'}`} />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-purple-500 rounded-full border border-black animate-pulse" />
                )}
            </button>

            {isOpen && (
                <div className="fixed md:absolute top-16 md:top-full right-2 left-2 md:right-0 md:left-auto mt-3 md:w-80 bg-[#0A0A0B] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Notifications</h3>
                        {unreadCount > 0 && (
                            <span className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full border border-purple-500/20 font-bold">
                                {unreadCount} NEW
                            </span>
                        )}
                    </div>

                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="px-6 py-10 text-center">
                                <div className="w-12 h-12 bg-white/[0.02] rounded-full flex items-center justify-center mx-auto mb-3">
                                    <Bell className="w-6 h-6 text-gray-600" />
                                </div>
                                <p className="text-sm text-gray-500">No notifications yet.</p>
                            </div>
                        ) : (
                            notifications.map((n) => (
                                <div
                                    key={n.id}
                                    className={`p-4 border-b border-white/5 last:border-0 hover:bg-white/[0.03] transition-colors cursor-default ${!n.isSeen ? 'bg-purple-500/[0.02]' : ''}`}
                                >
                                    <div className="flex gap-3">
                                        <div className="mt-0.5 w-8 h-8 rounded-full bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                                            {getIcon(n.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-white leading-tight mb-1">{n.title}</p>
                                            <p className="text-xs text-gray-400 leading-relaxed mb-2 line-clamp-2">{n.message}</p>
                                            <p className="text-[10px] text-gray-600 font-medium">
                                                {new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {notifications.length > 0 && (
                        <div className="px-4 py-3 bg-white/[0.01] border-t border-white/5 text-center">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-[10px] font-bold text-gray-500 hover:text-white uppercase tracking-widest transition-colors"
                            >
                                Close Panel
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
