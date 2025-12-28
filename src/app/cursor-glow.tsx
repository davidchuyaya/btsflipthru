"use client";

import { useEffect, useState, useRef } from "react";

const GLOW_SIZE = 100;

export default function HoldGlow() {
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const [visible, setVisible] = useState(false);
    const activeRef = useRef(false);

    useEffect(() => {
        const handleMouseDown = (e: MouseEvent) => {
            setPos({ x: e.clientX, y: e.clientY });
            activeRef.current = true;
            setVisible(true); // show glow
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (activeRef.current) {
                setPos({ x: e.clientX, y: e.clientY });
            }
        };

        const handleMouseUp = () => {
            activeRef.current = false;
            setVisible(false); // hide glow
        };

        window.addEventListener("mousedown", handleMouseDown);
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);

        return () => {
            window.removeEventListener("mousedown", handleMouseDown);
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, []);

    if (!visible) return null;

    return (
        <div
            style={{
                position: "fixed",
                left: pos.x - (GLOW_SIZE - 20.5) / 2,
                top: pos.y - (GLOW_SIZE - 20.5) / 2,
                width: GLOW_SIZE,
                height: GLOW_SIZE,
                pointerEvents: "none",
                borderRadius: "50%",
                background: "radial-gradient(circle, #efe1f1 0%, rgba(0,255,255,0) 70%)",
                transition: "opacity 0.1s",
            }}
        />
    );
}
