import React, { useRef, useState, useCallback, useEffect } from 'react';
import { ProfileCard } from './ProfileCard';
import { Profile, SwipeDirection } from '../types';
import { Heart, X, Star } from 'lucide-react';

interface AnimatedSwipeCardProps {
    profile: Profile;
    currentUser: Profile;
    onShowDetails: () => void;
    onSwipe: (direction: SwipeDirection) => void;
    programmaticSwipeDirection: SwipeDirection | null;
}

/*
 * Premium Swipe Card — pure CSS transforms + transitions.
 * Works with the existing App.tsx lifecycle:
 *   1. Button click → handleSwipe → setSwipeDirection(dir) → 400 ms timeout → clear
 *   2. Drag gesture  → fires onSwipe which goes through the SAME path
 *
 * Visual layers:
 *   • Card wrapper  — translateX / Y / rotate / scale with cubic-bezier spring
 *   • Direction overlays — opacity driven by drag offset OR programmatic direction
 *   • Entrance animation — subtle scale-up + fade via CSS @keyframes
 */
export const AnimatedSwipeCard: React.FC<AnimatedSwipeCardProps> = ({
    profile,
    currentUser,
    onShowDetails,
    onSwipe,
    programmaticSwipeDirection,
}) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [dragState, setDragState] = useState({ x: 0, y: 0, isDragging: false });
    const [overlayDir, setOverlayDir] = useState<'left' | 'right' | 'super' | null>(null);
    const startPos = useRef({ x: 0, y: 0 });
    const isDraggingRef = useRef(false);

    // ── Programmatic swipe styles ─────────────────────────────────
    const getExitStyle = (): React.CSSProperties => {
        if (!programmaticSwipeDirection) return {};
        const W = window.innerWidth;
        switch (programmaticSwipeDirection) {
            case SwipeDirection.LEFT:
                return { transform: `translateX(${-W * 1.2}px) rotate(-18deg) scale(0.92)`, opacity: 0 };
            case SwipeDirection.RIGHT:
                return { transform: `translateX(${W * 1.2}px) rotate(18deg) scale(0.92)`, opacity: 0 };
            case SwipeDirection.SUPER:
                return { transform: 'translateY(-100vh) scale(0.85)', opacity: 0 };
            default:
                return {};
        }
    };

    // ── Drag-based inline style ───────────────────────────────────
    const getDragStyle = (): React.CSSProperties => {
        if (programmaticSwipeDirection) return {};
        if (!dragState.isDragging && dragState.x === 0 && dragState.y === 0) return {};
        const rotateDeg = dragState.x * 0.06; // subtle elegant rotation
        const scale = 1 + Math.abs(dragState.x) * 0.0001; // micro scale-up while dragging
        return {
            transform: `translate(${dragState.x}px, ${dragState.y}px) rotate(${rotateDeg}deg) scale(${Math.min(scale, 1.03)})`,
            transition: dragState.isDragging ? 'none' : 'transform 0.65s cubic-bezier(0.34,1.56,0.64,1), opacity 0.5s ease',
        };
    };

    // ── Overlay opacity from drag ─────────────────────────────────
    const likeProgress = Math.min(Math.max(dragState.x / 120, 0), 1);
    const nopeProgress = Math.min(Math.max(-dragState.x / 120, 0), 1);
    const superProgress = Math.min(Math.max(-dragState.y / 100, 0), 1);

    // ── Touch / Mouse handlers ────────────────────────────────────
    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        if (programmaticSwipeDirection) return;
        // Don't start drag on buttons / interactive elements
        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('a')) return;

        isDraggingRef.current = true;
        startPos.current = { x: e.clientX, y: e.clientY };
        setDragState(prev => ({ ...prev, isDragging: true }));
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }, [programmaticSwipeDirection]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!isDraggingRef.current) return;
        const dx = e.clientX - startPos.current.x;
        const dy = e.clientY - startPos.current.y;
        setDragState({ x: dx, y: dy, isDragging: true });

        // Update overlay hint
        if (dy < -80 && Math.abs(dy) > Math.abs(dx)) {
            setOverlayDir('super');
        } else if (dx > 60) {
            setOverlayDir('right');
        } else if (dx < -60) {
            setOverlayDir('left');
        } else {
            setOverlayDir(null);
        }
    }, []);

    const handlePointerUp = useCallback(() => {
        if (!isDraggingRef.current) return;
        isDraggingRef.current = false;

        const { x, y } = dragState;
        const THRESHOLD = 100;
        const V_THRESHOLD = 80;

        let dir: SwipeDirection | null = null;
        if (y < -V_THRESHOLD && Math.abs(y) > Math.abs(x)) {
            dir = SwipeDirection.SUPER;
        } else if (x > THRESHOLD) {
            dir = SwipeDirection.RIGHT;
        } else if (x < -THRESHOLD) {
            dir = SwipeDirection.LEFT;
        }

        if (dir) {
            // Fly out with CSS transition, then trigger swipe
            const W = window.innerWidth;
            let exitX = 0, exitY = 0;
            if (dir === SwipeDirection.LEFT) { exitX = -W * 1.2; }
            if (dir === SwipeDirection.RIGHT) { exitX = W * 1.2; }
            if (dir === SwipeDirection.SUPER) { exitY = -window.innerHeight; }

            setDragState({ x: exitX, y: exitY, isDragging: false });

            // Small delay so exit starts visually before App.tsx processes
            setTimeout(() => {
                onSwipe(dir!);
            }, 80);
        } else {
            // Snap back with spring CSS
            setDragState({ x: 0, y: 0, isDragging: false });
            setOverlayDir(null);
        }
    }, [dragState, onSwipe]);

    // Reset drag state when profile changes
    useEffect(() => {
        setDragState({ x: 0, y: 0, isDragging: false });
        setOverlayDir(null);
    }, [profile.id]);

    // Compute final card style
    const exitStyle = getExitStyle();
    const dragStyle = getDragStyle();
    const isExiting = !!programmaticSwipeDirection;

    const cardStyle: React.CSSProperties = {
        ...dragStyle,
        ...(isExiting ? exitStyle : {}),
        transition: isExiting
            ? 'transform 0.7s cubic-bezier(0.32, 0, 0.15, 1), opacity 0.55s cubic-bezier(0.4, 0, 0.2, 1)'
            : dragStyle.transition || 'transform 0.65s cubic-bezier(0.34,1.56,0.64,1), opacity 0.5s ease',
    };

    // Which overlay should show
    const showLike = programmaticSwipeDirection === SwipeDirection.RIGHT || overlayDir === 'right';
    const showNope = programmaticSwipeDirection === SwipeDirection.LEFT || overlayDir === 'left';
    const showSuper = programmaticSwipeDirection === SwipeDirection.SUPER || overlayDir === 'super';
    const overlayOpacityLike = programmaticSwipeDirection === SwipeDirection.RIGHT ? 1 : likeProgress;
    const overlayOpacityNope = programmaticSwipeDirection === SwipeDirection.LEFT ? 1 : nopeProgress;
    const overlayOpacitySuper = programmaticSwipeDirection === SwipeDirection.SUPER ? 1 : superProgress;

    return (
        <div
            ref={cardRef}
            className="absolute inset-0 z-10 mx-4 select-none"
            style={cardStyle}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
        >
            {/* Entrance animation wrapper */}
            <div
                key={profile.id}
                className="w-full h-full"
                style={{
                    animation: 'cardEntrance 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
                }}
            >
                <ProfileCard
                    profile={profile}
                    onShowDetails={onShowDetails}
                    currentUser={currentUser}
                />
            </div>

            {/* ─── LIKE Overlay ─── */}
            {(showLike || overlayOpacityLike > 0) && (
                <div
                    className="absolute inset-0 z-20 flex items-center justify-center rounded-3xl overflow-hidden pointer-events-none"
                    style={{ opacity: overlayOpacityLike, transition: 'opacity 0.25s ease-out' }}
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-gold-500/50 via-amber-400/25 to-transparent rounded-3xl" />
                    <div className="absolute inset-0 rounded-3xl ring-4 ring-gold-400/80 shadow-[inset_0_0_80px_rgba(212,175,55,0.35),0_0_100px_rgba(212,175,55,0.5)]" />
                    <div className="relative flex flex-col items-center gap-3 transform scale-110">
                        <div className="w-24 h-24 rounded-full bg-gold-500/25 border-2 border-gold-400/70 flex items-center justify-center shadow-[0_0_60px_rgba(212,175,55,0.8)] backdrop-blur-sm">
                            <Heart size={48} className="text-gold-300 fill-gold-400 drop-shadow-[0_0_25px_rgba(212,175,55,1)]" />
                        </div>
                        <span className="text-gold-300 font-serif text-2xl tracking-[0.35em] uppercase font-bold drop-shadow-[0_0_15px_rgba(212,175,55,0.9)]">Like</span>
                    </div>
                </div>
            )}

            {/* ─── NOPE Overlay ─── */}
            {(showNope || overlayOpacityNope > 0) && (
                <div
                    className="absolute inset-0 z-20 flex items-center justify-center rounded-3xl overflow-hidden pointer-events-none"
                    style={{ opacity: overlayOpacityNope, transition: 'opacity 0.25s ease-out' }}
                >
                    <div className="absolute inset-0 bg-gradient-to-bl from-slate-900/70 via-red-950/30 to-transparent rounded-3xl" />
                    <div className="absolute inset-0 rounded-3xl ring-3 ring-red-500/50 shadow-[inset_0_0_50px_rgba(239,68,68,0.2)]" />
                    <div className="relative flex flex-col items-center gap-3 transform scale-110">
                        <div className="w-24 h-24 rounded-full bg-red-900/40 border-2 border-red-500/50 flex items-center justify-center backdrop-blur-sm shadow-[0_0_40px_rgba(239,68,68,0.5)]">
                            <X size={48} className="text-red-400 drop-shadow-[0_0_15px_rgba(239,68,68,0.7)]" strokeWidth={2.5} />
                        </div>
                        <span className="text-red-400 font-serif text-2xl tracking-[0.35em] uppercase font-bold drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]">Pass</span>
                    </div>
                </div>
            )}

            {/* ─── SUPER LIKE Overlay ─── */}
            {(showSuper || overlayOpacitySuper > 0) && (
                <div
                    className="absolute inset-0 z-20 flex items-center justify-center rounded-3xl overflow-hidden pointer-events-none"
                    style={{ opacity: overlayOpacitySuper, transition: 'opacity 0.25s ease-out' }}
                >
                    <div className="absolute inset-0 bg-gradient-to-t from-blue-900/70 via-blue-500/35 to-transparent rounded-3xl" />
                    <div className="absolute inset-0 rounded-3xl ring-4 ring-blue-400/70 shadow-[inset_0_0_100px_rgba(59,130,246,0.35),0_0_100px_rgba(59,130,246,0.5)]" />
                    <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-blue-500/25 to-transparent" />
                    <div className="relative flex flex-col items-center gap-3 transform scale-110">
                        <div className="w-28 h-28 rounded-full bg-blue-500/25 border-2 border-blue-400/70 flex items-center justify-center shadow-[0_0_80px_rgba(59,130,246,0.9)] backdrop-blur-sm">
                            <Star size={56} className="text-blue-300 fill-blue-400 drop-shadow-[0_0_30px_rgba(59,130,246,1)]" />
                        </div>
                        <span className="text-blue-300 font-serif text-2xl tracking-[0.35em] uppercase font-bold drop-shadow-[0_0_15px_rgba(59,130,246,1)]">Super Like</span>
                    </div>
                </div>
            )}
        </div>
    );
};
