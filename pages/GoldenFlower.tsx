
import React, { useState, useEffect, useRef } from 'react';
import { Crown, Coins, Eye, ShieldAlert, XCircle, HandMetal, Trophy, User, ArrowRightCircle, Scroll, Play, History, BookOpen, X, Sparkles, UserCheck, Zap, Brain, EyeOff, Users as UsersIcon } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import { activityService } from '../services/activityService';
import { User as UserType } from '../types';

// --- Types & Constants ---

type Suit = '♠' | '♥' | '♣' | '♦';
type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
type AILevel = 'beginner' | 'intermediate' | 'advanced' | 'master' | 'grandmaster';

interface Card {
    id: string; 
    suit: Suit;
    rank: Rank;
    value: number; 
    isHidden: boolean;
}

interface Player {
    id: string;
    name: string;
    title: string;
    avatar: string;
    hand: Card[];
    chips: number;
    hasFolded: boolean;
    hasSeen: boolean; 
    isRevealed: boolean; 
    isTurn: boolean;
    totalBet: number;
    status: string;
    isRealUser: boolean; // True if it's the human player
    isDbUser: boolean;   // True if it's a real user record from DB (even if AI controlled)
    aiLevel?: AILevel; 
    winner?: boolean;
}

type HandType = '235' | 'Leopard' | 'StraightFlush' | 'Flush' | 'Straight' | 'Pair' | 'HighCard';

const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const SUITS: Suit[] = ['♦', '♣', '♥', '♠'];
const ANTE = 100;
const MAX_ROUNDS = 15;
const MAX_BET_LIMIT = 2000;

// AI Profiles linked to Point Tiers
const AI_PROFILES: Record<AILevel, { threshold: number, bluff: number, aggro: number, label: string, color: string }> = {
    beginner: { threshold: 0.1, bluff: 0.05, aggro: 0.1, label: '呆萌新秀', color: 'text-gray-400' },
    intermediate: { threshold: 0.3, bluff: 0.15, aggro: 0.3, label: '江湖游侠', color: 'text-blue-400' },
    advanced: { threshold: 0.5, bluff: 0.3, aggro: 0.5, label: '老谋深算', color: 'text-purple-400' },
    master: { threshold: 0.6, bluff: 0.5, aggro: 0.7, label: '一代宗师', color: 'text-orange-400' },
    grandmaster: { threshold: 0.4, bluff: 0.7, aggro: 0.9, label: '独孤求败', color: 'text-red-500' },
};

interface EdictData {
    oldEmperor: string;
    newEmperor: string;
    points: number;
    date: string;
}

// --- Logic Helpers ---

const getCardValue = (rank: Rank): number => {
    const map: Record<string, number> = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };
    return map[rank];
};

const createDeck = (): Card[] => {
    let deck: Card[] = [];
    SUITS.forEach(suit => {
        RANKS.forEach(rank => {
            deck.push({ 
                id: `${rank}-${suit}-${Math.random()}`, 
                suit, 
                rank, 
                value: getCardValue(rank), 
                isHidden: true 
            });
        });
    });
    return deck.sort(() => Math.random() - 0.5);
};

const evaluateHand = (hand: Card[]): { type: HandType; score: number; rawValues: number[] } => {
    const values = hand.map(c => c.value).sort((a, b) => b - a);
    const suits = hand.map(c => c.suit);
    const isFlush = suits.every(s => s === suits[0]);
    
    // Straight Logic: A-2-3 handling included
    const isStraight = (values[0] - values[1] === 1 && values[1] - values[2] === 1) || 
                       (values[0] === 14 && values[1] === 3 && values[2] === 2); 

    const is235 = values[0] === 5 && values[1] === 3 && values[2] === 2; // Unsuited 235

    const tieBreaker = values[0] * 10000 + values[1] * 100 + values[2];

    if (values[0] === values[1] && values[1] === values[2]) {
        return { type: 'Leopard', score: 600000 + tieBreaker, rawValues: values };
    }
    if (isFlush && isStraight) {
        return { type: 'StraightFlush', score: 500000 + tieBreaker, rawValues: values };
    }
    if (isFlush) {
        return { type: 'Flush', score: 400000 + tieBreaker, rawValues: values };
    }
    if (isStraight) {
        return { type: 'Straight', score: 300000 + tieBreaker, rawValues: values };
    }
    if (values[0] === values[1] || values[1] === values[2]) {
        const pairVal = values[1]; 
        const kicker = values[0] === values[1] ? values[2] : values[0];
        return { type: 'Pair', score: 200000 + pairVal * 10000 + kicker, rawValues: values };
    }
    if (is235) {
        // 235 is nominally lowest, but beats Leopard. Score 0 facilitates basic compare, special logic handles kill.
        return { type: '235', score: 0, rawValues: values }; 
    }
    return { type: 'HighCard', score: 100000 + tieBreaker, rawValues: values };
};

const compareHands = (handA: Card[], handB: Card[]): boolean => {
    const evalA = evaluateHand(handA);
    const evalB = evaluateHand(handB);
    
    // Special Rule: 235 kills Leopard
    if (evalA.type === '235' && evalB.type === 'Leopard') return true; 
    if (evalB.type === '235' && evalA.type === 'Leopard') return false; 
    
    // Tie Rule: Challenger loses if strictly equal
    if (evalA.score === evalB.score) return false;

    return evalA.score > evalB.score;
};

// --- Component ---

export const GoldenFlowerPage: React.FC = () => {
    const { user, refreshUser } = useApp();
    const [gamePhase, setGamePhase] = useState<'setup' | 'dealing' | 'playing' | 'ended'>('setup');
    const [playerCount, setPlayerCount] = useState(3);
    const [deck, setDeck] = useState<Card[]>([]);
    const [players, setPlayers] = useState<Player[]>([]);
    const [pot, setPot] = useState(0);
    const [currentBet, setCurrentBet] = useState(ANTE);
    const [turnIndex, setTurnIndex] = useState(0);
    const [dealerIndex, setDealerIndex] = useState<number>(-1);
    const [roundCount, setRoundCount] = useState(1);
    const [winner, setWinner] = useState<Player | null>(null);
    const [log, setLog] = useState<string[]>([]);
    const logEndRef = useRef<HTMLDivElement>(null);
    const [showRules, setShowRules] = useState(false);
    
    // Imperial System State
    const [currentEmperor, setCurrentEmperor] = useState<UserType | null>(null);
    const [edict, setEdict] = useState<EdictData | null>(null);

    // Initial Load
    useEffect(() => {
        findCurrentEmperor();
    }, [user]);

    // Auto-scroll logs
    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [log]);

    // AI Logic Loop
    useEffect(() => {
        if (gamePhase !== 'playing') return;

        const currentPlayer = players[turnIndex];
        // Skip user or folded players
        if (!currentPlayer || currentPlayer.isRealUser || currentPlayer.hasFolded) return;

        // Dynamic delay based on AI level
        const delay = 1000 + Math.random() * 2000;

        const timer = setTimeout(() => {
            handleAITurn(currentPlayer);
        }, delay); 

        return () => clearTimeout(timer);
    }, [turnIndex, gamePhase, players]); 

    const addLog = (msg: string) => {
        setLog(prev => [...prev, `[${new Date().toLocaleTimeString().slice(0,8)}] ${msg}`]);
    };

    // --- Imperial Logic ---

    const findCurrentEmperor = () => {
        const allUsers = userService.getUsers();
        if (allUsers.length > 0) {
            const sorted = [...allUsers].sort((a, b) => (b.points || 0) - (a.points || 0));
            setCurrentEmperor(sorted[0]);
        }
    };

    const getPlayerTitle = (points: number, isEmperor: boolean) => {
        if (isEmperor) return '皇帝至尊 SVIP';
        if (points > 60000) return '皇帝至尊 SVIP';
        if (points > 35000) return '太子太保';
        if (points > 20000) return '宰相大人';
        if (points > 10000) return '户部尚书';
        if (points > 6000) return '东厂督公';
        if (points > 3000) return '举人老爷';
        if (points > 1000) return '草民';
        return '贱婢';
    };

    // --- Core Game Functions ---

    const prepareGame = () => {
        if (!user) return;
        
        // 1. Fetch Real Users from DB to be Opponents
        const allUsers = userService.getUsers();
        const potentialOpponents = allUsers
            .filter(u => u.id !== user.id && u.status === 'active' && (u.points || 0) >= ANTE) // Must be active and afford ante
            .sort(() => 0.5 - Math.random()); // Shuffle

        if (potentialOpponents.length < playerCount - 1) {
            alert(`陛下，国库（用户库）中能付得起底注（${ANTE}）的活跃臣子不足，请先去【用户管理】添加或充值！`);
            setGamePhase('setup');
            return;
        }

        const selectedOpponents = potentialOpponents.slice(0, playerCount - 1);
        const newPlayers: Player[] = [];
        const myEmperorStatus = currentEmperor?.id === user.id;
        
        // 1. Current Human Player
        newPlayers.push({
            id: 'user', // We keep 'user' ID for UI logic convenience for the Human, but we sync to user.id
            name: user.nickname || '朕',
            title: getPlayerTitle(user.points || 0, myEmperorStatus),
            avatar: user.avatar || '',
            hand: [],
            chips: user.points || 0,
            hasFolded: false,
            hasSeen: false,
            isRevealed: false,
            isTurn: false,
            totalBet: 0,
            status: '等待',
            isRealUser: true,
            isDbUser: true
        });

        // 2. Real User NPCs
        selectedOpponents.forEach(u => {
            const pts = u.points || 0;
            // Determine AI Level based on real points
            let level: AILevel = 'beginner';
            if (pts > 50000) level = 'grandmaster';
            else if (pts > 20000) level = 'master';
            else if (pts > 10000) level = 'advanced';
            else if (pts > 3000) level = 'intermediate';

            newPlayers.push({
                id: u.id, // REAL DB ID
                name: u.nickname || u.username,
                title: getPlayerTitle(pts, u.id === currentEmperor?.id),
                avatar: u.avatar || '',
                hand: [],
                chips: pts,
                hasFolded: false,
                hasSeen: false,
                isRevealed: false,
                isTurn: false,
                totalBet: 0,
                status: '等待',
                isRealUser: false,
                isDbUser: true, // This is a real user from DB
                aiLevel: level
            });
        });

        // Dealer Rotation
        let nextDealerIdx = -1;
        if (winner) {
            // Try to find the winner in new lineup (unlikely if shuffled, but possible)
            // For simplicity, random dealer or if we keep lineup we could track. 
            // Here we always reshuffle opponents, so random dealer is fair.
            nextDealerIdx = Math.floor(Math.random() * newPlayers.length);
        } else {
            nextDealerIdx = Math.floor(Math.random() * newPlayers.length);
        }
        setDealerIndex(nextDealerIdx);

        startRound(newPlayers, nextDealerIdx);
    };

    const startRound = (initialPlayers: Player[], dealerIdx: number) => {
        const newDeck = createDeck();
        const deal = (count: number) => newDeck.splice(0, count);

        // Deduct Ante immediately
        const activePlayers = initialPlayers.map(p => {
            const cost = ANTE;
            // Sync to DB immediately
            if (p.id === 'user') {
                syncUserPoints(user!.id, -cost);
            } else {
                syncUserPoints(p.id, -cost);
            }

            return {
                ...p,
                hand: deal(3),
                chips: p.chips - cost,
                totalBet: cost,
                hasFolded: false,
                hasSeen: false,
                isRevealed: false,
                status: '入局',
                isTurn: false,
                winner: false
            };
        });

        setDeck(newDeck); 
        setPlayers(activePlayers);
        setPot(ANTE * activePlayers.length);
        setCurrentBet(ANTE);
        setRoundCount(1);
        setWinner(null);
        setEdict(null);
        setGamePhase('dealing');
        setLog([]);
        addLog(`--- 宣旨：开启 ${activePlayers.length} 人对局，底注 ${ANTE} ---`);
        addLog(`庄家：${activePlayers[dealerIdx].name}`);

        setTimeout(() => {
            const startIndex = (dealerIdx + 1) % activePlayers.length;
            setPlayers(prev => prev.map((p, i) => ({ ...p, isTurn: i === startIndex })));
            setTurnIndex(startIndex);
            setGamePhase('playing');
        }, 1800);
    };

    const syncUserPoints = (userId: string, delta: number) => {
        // 1. If it's the current logged in user
        if (user && (userId === user.id || userId === 'user')) {
            const newPoints = (user.points || 0) + delta;
            const updated = { ...user, points: newPoints };
            authService.updateUser(updated); // Updates Context + LocalStorage + DB
        } 
        // 2. If it's an NPC (who is actually a real user in DB)
        else {
            const allUsers = userService.getUsers();
            const target = allUsers.find(u => u.id === userId);
            if (target) {
                target.points = (target.points || 0) + delta;
                userService.saveUser(target); // Saves to LocalStorage + Cloud
            }
        }
    };

    const nextTurn = () => {
        let nextIndex = (turnIndex + 1) % players.length;
        let loopCount = 0;
        
        while (players[nextIndex].hasFolded && loopCount < players.length) {
            nextIndex = (nextIndex + 1) % players.length;
            loopCount++;
        }

        const active = players.filter(p => !p.hasFolded);
        if (active.length === 1) {
            endGame(active[0]);
            return;
        }

        const startIdx = (dealerIndex + 1) % players.length;
        if (nextIndex === startIdx) {
            setRoundCount(r => r + 1);
            addLog(`--- 第 ${roundCount + 1} 轮 ---`);
        }

        setPlayers(prev => prev.map((p, i) => ({ ...p, isTurn: i === nextIndex })));
        setTurnIndex(nextIndex);
    };

    const handleAITurn = (ai: Player) => {
        const level = ai.aiLevel || 'beginner';
        const profile = AI_PROFILES[level];
        const handEval = evaluateHand(ai.hand);
        
        // Normalize Strength (approximate)
        let strength = handEval.score / 700000; 
        
        // 1. Force Compare on Max Rounds
        if (roundCount >= MAX_ROUNDS) {
             handleAction(ai.id, 'compare');
             return;
        }

        // 2. Logic to Look at Cards
        if (!ai.hasSeen) {
            let lookChance = 0.1;
            if (level === 'beginner') lookChance = 0.5;
            if (roundCount > 3) lookChance = 0.8;
            
            if (Math.random() < lookChance) {
                handleAction(ai.id, 'look');
                return; 
            }
        }

        let action: 'fold' | 'call' | 'raise' | 'compare' | 'look' = 'call';

        // 3. Decision Matrix
        if (ai.hasSeen) {
            if (strength < profile.threshold) {
                if (Math.random() < profile.bluff) {
                    action = Math.random() > 0.5 ? 'raise' : 'call';
                } else {
                    action = 'fold';
                }
            } else {
                if (Math.random() < profile.aggro) {
                    action = 'raise';
                } else {
                    action = 'call';
                }
                // High level trap
                if ((level === 'master' || level === 'grandmaster') && strength > 0.8 && Math.random() < 0.3) {
                    action = 'call'; 
                }
            }
        } else {
            // Blind Play
            if (currentBet > 300 && level !== 'grandmaster') {
                handleAction(ai.id, 'look'); // Pressure forces look
                return;
            }
            if (Math.random() < profile.aggro * 0.3) {
                action = 'raise';
            }
        }

        if (pot > 3000 && !ai.hasFolded && activeCount() > 2) {
             if (Math.random() > 0.6) action = 'compare';
        }

        if (action === 'raise' && currentBet >= MAX_BET_LIMIT) {
            action = 'call';
        }

        if (ai.chips < currentBet) action = 'fold';

        handleAction(ai.id, action);
    };

    const activeCount = () => players.filter(p => !p.hasFolded).length;

    const handleAction = (playerId: string, action: 'fold' | 'call' | 'raise' | 'compare' | 'look') => {
        // Use immutable update pattern
        setPlayers(prevPlayers => {
            const pIndex = prevPlayers.findIndex(p => p.id === playerId);
            if (pIndex === -1) return prevPlayers;

            let targetId: string | null = null;
            if (action === 'compare') {
                let tIdx = (pIndex + 1) % prevPlayers.length;
                while (prevPlayers[tIdx].hasFolded) tIdx = (tIdx + 1) % prevPlayers.length;
                targetId = prevPlayers[tIdx].id;
            }

            return prevPlayers.map((p) => {
                // Update active player
                if (p.id === playerId) {
                    const newP = { ...p };
                    if (action === 'look') {
                        newP.hasSeen = true;
                        newP.status = '看牌';
                        if (newP.id === 'user') newP.isRevealed = true;
                    } else if (action === 'fold') {
                        newP.hasFolded = true;
                        newP.status = '弃牌';
                    } else if (action === 'call') {
                        const cost = newP.hasSeen ? currentBet * 2 : currentBet;
                        newP.chips -= cost;
                        newP.totalBet += cost;
                        newP.status = '跟注';
                    } else if (action === 'raise') {
                        let raiseAmt = currentBet + ANTE * 2;
                        if (raiseAmt > MAX_BET_LIMIT) raiseAmt = MAX_BET_LIMIT;
                        const cost = newP.hasSeen ? raiseAmt * 2 : raiseAmt;
                        newP.chips -= cost;
                        newP.totalBet += cost;
                        newP.status = '加注';
                    } else if (action === 'compare') {
                        const baseCost = newP.hasSeen ? currentBet * 2 : currentBet;
                        const compareCost = baseCost * 2;
                        newP.chips -= compareCost;
                        newP.isRevealed = true; // REVEAL SELF
                    }
                    return newP;
                }
                // Update comparison target
                if (action === 'compare' && p.id === targetId) {
                    return { ...p, isRevealed: true };
                }
                return p;
            });
        });

        // Side Effects (DB Sync & Logs)
        const player = players.find(p => p.id === playerId);
        const pName = player?.name || '玩家';

        if (action === 'look') {
            if (playerId === 'user') addLog('陛下龙目一扫，乾坤尽在掌握');
            else addLog(`${pName} 偷看了一眼底牌`);
            return;
        }

        if (action === 'call') {
            const p = players.find(p => p.id === playerId)!;
            const cost = p.hasSeen ? currentBet * 2 : currentBet;
            setPot(old => old + cost);
            addLog(`${pName} 跟注 (投入 ${cost})`);
            syncUserPoints(playerId === 'user' ? user!.id : playerId, -cost); // REAL SYNC
        } else if (action === 'raise') {
            const p = players.find(p => p.id === playerId)!;
            let raiseAmt = currentBet + ANTE * 2;
            if (raiseAmt > MAX_BET_LIMIT) raiseAmt = MAX_BET_LIMIT;
            const cost = p.hasSeen ? raiseAmt * 2 : raiseAmt;
            setPot(old => old + cost);
            setCurrentBet(raiseAmt);
            addLog(`${pName} 加注至 ${raiseAmt}`);
            syncUserPoints(playerId === 'user' ? user!.id : playerId, -cost); // REAL SYNC
        } else if (action === 'fold') {
            addLog(`${pName} 选择弃牌保平安`);
        } else if (action === 'compare') {
            const pIndex = players.findIndex(p => p.id === playerId);
            let tIdx = (pIndex + 1) % players.length;
            while (players[tIdx].hasFolded) tIdx = (tIdx + 1) % players.length;
            const target = players[tIdx];
            const p = players[pIndex];

            const baseCost = p.hasSeen ? currentBet * 2 : currentBet;
            const compareCost = baseCost * 2;
            setPot(old => old + compareCost);
            addLog(`${pName} 找 ${target.name} 比牌 (花费 ${compareCost})`);
            syncUserPoints(playerId === 'user' ? user!.id : playerId, -compareCost); // REAL SYNC

            const iWin = compareHands(p.hand, target.hand);
            
            setPlayers(current => current.map(cp => {
                if (iWin && cp.id === target.id) {
                    return { ...cp, hasFolded: true, status: '比牌输' };
                }
                if (!iWin && cp.id === playerId) {
                    return { ...cp, hasFolded: true, status: '比牌输' };
                }
                return cp;
            }));

            if (iWin) addLog(`${target.name} 不敌，败下阵来`);
            else addLog(`${pName} 挑战失败，被贬出局`);
        }

        const delay = action === 'compare' ? 3000 : 800; 
        setTimeout(nextTurn, delay);
    };

    const endGame = (winnerPlayer: Player) => {
        setGamePhase('ended');
        setWinner(winnerPlayer);
        setDealerIndex(players.findIndex(p => p.id === winnerPlayer.id)); 
        
        // Reveal ALL cards
        setPlayers(prev => prev.map(p => ({ 
            ...p, 
            hasSeen: true,
            isRevealed: true, 
            winner: p.id === winnerPlayer.id 
        })));
        
        // GIVE POT TO WINNER
        const winId = winnerPlayer.id === 'user' ? user!.id : winnerPlayer.id;
        syncUserPoints(winId, pot);

        if (winnerPlayer.id === 'user') {
            activityService.logActivity(user!, 'checkIn', `大夏炸金花：大获全胜，赢得 ${pot} 积分`);
            refreshUser();
        } else {
            // If NPC wins, log it? Maybe excessive.
        }

        addLog(`=== 战局结束：${winnerPlayer.name} 独揽 ${pot} 积分 ===`);
        checkEmperorSuccession(winnerPlayer);
    };

    const checkEmperorSuccession = (winnerPlayer: Player) => {
        const allUsers = userService.getUsers();
        // Since we just updated points, re-sort
        const sorted = [...allUsers].sort((a, b) => (b.points || 0) - (a.points || 0));
        const newTopUser = sorted[0];

        // If the winner is now top (or was top), check if we need to issue an edict
        if (newTopUser.id === (winnerPlayer.id === 'user' ? user?.id : winnerPlayer.id)) {
            if (!currentEmperor || newTopUser.id !== currentEmperor.id) {
                const dateStr = new Date().toLocaleDateString('zh-CN', {year: 'numeric', month: 'long', day: 'numeric'});
                setEdict({
                    oldEmperor: currentEmperor?.nickname || currentEmperor?.username || '先皇',
                    newEmperor: newTopUser.nickname || newTopUser.username,
                    points: newTopUser.points || 0,
                    date: dateStr
                });
                setCurrentEmperor(newTopUser);
                activityService.logActivity(newTopUser, 'update', `【登基大典】${newTopUser.nickname || newTopUser.username} 登顶权力巅峰，成为新任皇帝！`);
            }
        }
    };

    const getPlayerPosition = (index: number, total: number) => {
        if (index === 0) return { bottom: '2rem', left: '50%', transform: 'translateX(-50%)' };
        const angleStep = 360 / total;
        const startAngle = 90; 
        const currentAngle = startAngle + (index * angleStep);
        const rad = (currentAngle * Math.PI) / 180;
        const x = 50 + 40 * Math.cos(rad);
        const y = 50 + 35 * Math.sin(rad);
        return { left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' };
    };

    const renderCard = (card: Card, index: number, isRevealed: boolean) => {
        const color = (card.suit === '♥' || card.suit === '♦') ? 'text-red-600' : 'text-slate-900';
        const delay = index * 0.15;
        
        return (
            <div 
                className={`
                    w-12 h-16 md:w-16 md:h-24 rounded-lg shadow-xl cursor-default
                    transition-all duration-700 transform-style-3d relative
                    ${gamePhase === 'dealing' ? 'translate-y-[200px] scale-0 opacity-0' : 'translate-y-0 scale-100 opacity-100'}
                `}
                style={{ 
                    transitionDelay: `${delay}s`,
                    transform: isRevealed ? 'rotateY(180deg)' : 'rotateY(0deg)'
                }}
            >
                {/* Back Face */}
                <div className="absolute inset-0 backface-hidden rounded-lg bg-[#8B0000] border-2 border-[#FFD700] flex flex-col items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/binding-dark.png')]"></div>
                    <div className="w-[80%] h-[80%] border border-[#FFD700]/50 rounded flex items-center justify-center">
                        <span className="text-[#FFD700] text-xl font-serif font-bold opacity-90 drop-shadow-md">夏</span>
                    </div>
                </div>

                {/* Front Face */}
                <div className={`absolute inset-0 backface-hidden rounded-lg bg-white border border-gray-300 flex flex-col items-center justify-center ${color}`} 
                     style={{ transform: 'rotateY(180deg)' }}>
                    <span className="absolute top-1 left-1.5 text-xs md:text-sm font-bold font-serif">{card.rank}</span>
                    <span className="text-2xl md:text-3xl drop-shadow-sm">{card.suit}</span>
                    <span className="absolute bottom-1 right-1.5 text-xs md:text-sm font-bold font-serif rotate-180">{card.rank}</span>
                </div>
            </div>
        );
    };

    return (
        <div className="h-[calc(100vh-8rem)] w-full relative flex flex-col bg-[#0f0505] overflow-hidden">
            
            {/* Ambient Background */}
            <div className="absolute inset-0 opacity-40 pointer-events-none" 
                 style={{ 
                     backgroundImage: 'radial-gradient(circle at center, #2c0b0b 0%, #000000 100%)',
                 }}>
            </div>
            
            {/* Floating Gold Dust */}
            {Array.from({ length: 15 }).map((_, i) => (
                 <div key={i} className="absolute w-1 h-1 bg-[#FFD700] rounded-full opacity-0 animate-[float-dust_8s_linear_infinite]" 
                      style={{ 
                          top: `${Math.random() * 100}%`, 
                          left: `${Math.random() * 100}%`,
                          animationDelay: `${Math.random() * 5}s`,
                          animationDuration: `${5 + Math.random() * 5}s`
                      }}>
                 </div>
            ))}

            {/* Header */}
            <div className="text-center py-4 animate-fade-in-down z-10 flex flex-col items-center relative">
                <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-[#FFD700] to-[#B8860B] font-serif tracking-[0.2em] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] flex items-center gap-4">
                    <Crown className="w-10 h-10 text-[#FFD700] drop-shadow-md" />
                    大夏 · 紫禁之巅
                    <Crown className="w-10 h-10 text-[#FFD700] drop-shadow-md" />
                </h1>
                <p className="text-[#FFD700]/60 text-xs mt-2 font-medium tracking-widest uppercase">
                    当前在位: <span className="text-[#FFD700] font-bold text-sm border-b border-[#FFD700]/50 pb-0.5 mx-1">{currentEmperor?.nickname || '空缺'}</span> (龙气: {currentEmperor?.points || 0})
                </p>
                <button 
                    onClick={() => setShowRules(true)}
                    className="absolute right-6 top-4 text-[#FFD700]/80 hover:text-[#FFD700] transition-colors flex flex-col items-center group"
                >
                    <BookOpen className="h-6 w-6 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold mt-1">御定律令</span>
                </button>
            </div>

            {/* Rules Modal */}
            {showRules && (
                <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
                    <div className="bg-[#fff8e7] max-w-2xl w-full rounded-lg shadow-[0_0_50px_rgba(255,215,0,0.2)] overflow-hidden relative border-y-[12px] border-[#8B0000]">
                        <div className="bg-[#8B0000] p-4 flex justify-between items-center text-[#FFD700]">
                            <h2 className="text-xl font-bold font-serif flex items-center gap-2 tracking-widest"><Scroll className="w-5 h-5"/> 大夏律令</h2>
                            <button onClick={() => setShowRules(false)}><X className="w-6 h-6 hover:text-white transition-colors"/></button>
                        </div>
                        <div className="p-8 max-h-[70vh] overflow-y-auto space-y-4 text-slate-800 bg-[url('https://www.transparenttextures.com/patterns/rice-paper-2.png')]">
                            <table className="w-full text-sm border-collapse border border-[#8B0000]/20">
                                <tbody>
                                    {[
                                        ['真实对战', '所有 NPC 均为系统内的真实用户，输赢积分将实时同步到数据库。'],
                                        ['强制亮牌', '当局结束时，所有人的底牌强制公开。'],
                                        ['牌型大小', '豹子 > 顺金 > 金花 > 顺子 > 对子 > 散牌'],
                                        ['必杀规则', '235 (散牌) > 豹子 (至尊)。'],
                                        ['平局裁决', '点数完全相同时，主动发起比牌者判负。'],
                                        ['跟注/加注', '看牌后下注需双倍。'],
                                    ].map(([term, desc]) => (
                                        <tr key={term} className="border-b border-[#8B0000]/10">
                                            <td className="p-3 font-bold text-[#8B0000] whitespace-nowrap bg-red-50 align-top border-r border-[#8B0000]/10">{term}</td>
                                            <td className="p-3 text-slate-700 leading-relaxed">{desc}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Game Table Area */}
            <div className="flex-1 relative flex items-center justify-center perspective-[1000px]">
                
                {/* The Table */}
                <div className="relative w-[90%] md:w-[800px] aspect-[4/3] md:aspect-square bg-[#1a3c1a] rounded-[100px] md:rounded-full border-[12px] border-[#B8860B] shadow-[0_0_60px_rgba(0,0,0,0.9),inset_0_0_100px_rgba(0,0,0,0.8)] flex items-center justify-center transform-style-3d rotate-x-[10deg] transition-all duration-1000">
                    
                    {/* Felt Texture */}
                    <div className="absolute inset-0 opacity-20 rounded-[80px] md:rounded-full pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/felt.png")' }}></div>
                    
                    {/* Inner Gold Rim */}
                    <div className="absolute inset-4 border-2 border-[#FFD700]/30 rounded-[90px] md:rounded-full pointer-events-none"></div>

                    {/* HUD - Pot */}
                    {(gamePhase === 'playing' || gamePhase === 'ended' || gamePhase === 'dealing') && (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 flex flex-col items-center justify-center pointer-events-none">
                            <div className="text-[#FFD700]/40 text-[10px] font-black tracking-[0.5em] mb-2 uppercase">Total Pot</div>
                            <div className="text-6xl md:text-7xl font-black text-[#FFD700] flex items-center gap-2 drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] transition-all duration-300 transform scale-100 animate-[pulse_3s_infinite]">
                                <Trophy className="w-12 h-12 md:w-16 md:h-16" /> {pot}
                            </div>
                            <div className="mt-4 flex gap-4">
                                <div className="px-4 py-1 bg-black/40 rounded-full border border-[#FFD700]/30 text-[#FFD700]/80 text-xs font-mono">
                                    单注: {currentBet}
                                </div>
                                <div className="px-4 py-1 bg-black/40 rounded-full border border-[#FFD700]/30 text-[#FFD700]/80 text-xs font-mono">
                                    轮数: {roundCount}/{MAX_ROUNDS}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Imperial Edict Modal */}
                    {edict && (
                        <div className="absolute inset-0 z-[100] flex items-center justify-center animate-fade-in bg-black/60 backdrop-blur-sm rounded-[100px] md:rounded-full">
                            <div className="bg-[#fff8e7] text-[#8B0000] p-1 w-[90%] max-w-lg shadow-[0_0_100px_rgba(255,215,0,0.6)] transform scale-100 animate-bounce-in relative overflow-hidden rounded-lg">
                                <div className="border-[4px] border-[#8B0000] h-full p-8 flex flex-col items-center text-center bg-[url('https://www.transparenttextures.com/patterns/rice-paper-2.png')]">
                                    <div className="absolute top-2 left-2 text-4xl opacity-20 animate-pulse">🐉</div>
                                    <div className="absolute top-2 right-2 text-4xl opacity-20 scale-x-[-1] animate-pulse">🐉</div>
                                    <div className="mb-6 border-b-4 border-[#8B0000] pb-4 w-full">
                                        <h2 className="text-4xl font-black tracking-[0.5em] font-serif text-[#8B0000]">大夏诏书</h2>
                                    </div>
                                    <div className="space-y-6 font-serif text-lg font-bold leading-loose text-slate-800">
                                        <p>奉天承运，皇帝诏曰：</p>
                                        <p>今有 <span className="text-2xl text-red-600 mx-2 scale-110 inline-block font-black">{edict.newEmperor}</span></p>
                                        <p>于紫禁之巅力压群雄，文治武功，<br/>积分高达 <span className="text-[#B8860B] font-black text-xl">{edict.points}</span>，德配天地。</p>
                                        <p>即日起登基为帝，改元 <span className="text-red-600">至尊</span>。<br/>原皇帝 <span className="text-slate-500 text-sm">({edict.oldEmperor})</span> 退位让贤。</p>
                                        <p>钦此！</p>
                                    </div>
                                    <button onClick={() => setEdict(null)} className="mt-8 bg-[#8B0000] text-[#FFD700] px-8 py-3 rounded-full font-bold hover:scale-105 transition-transform shadow-xl flex items-center gap-2 border-2 border-[#FFD700]">
                                        <HandMetal className="w-5 h-5" /> 吾皇万岁
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Setup Phase Overlay */}
                    {gamePhase === 'setup' && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm rounded-[100px] md:rounded-full bg-black/40">
                            <div className="bg-[#fff8e7] text-slate-800 p-8 rounded-[3px] max-w-md w-full shadow-[0_0_50px_rgba(255,215,0,0.3)] relative border-y-[20px] border-[#8B0000]">
                                <div className="text-center space-y-6">
                                    <div className="inline-block border-2 border-[#8B0000] px-8 py-2 rounded-full bg-[#8B0000]/10">
                                        <h2 className="text-2xl font-black text-[#8B0000] tracking-[0.5em] font-serif">圣旨</h2>
                                    </div>
                                    <p className="text-sm font-bold text-[#8B0000]/70">今夜紫禁之巅，几人对决？</p>
                                    <div className="flex justify-center gap-4 py-4">
                                        {[3, 4, 5, 6].map(num => (
                                            <button key={num} onClick={() => setPlayerCount(num)} className={`w-14 h-14 rounded-full font-black text-xl flex items-center justify-center border-2 transition-all ${playerCount === num ? 'bg-[#8B0000] text-[#FFD700] border-[#FFD700] scale-110 shadow-lg' : 'bg-transparent border-slate-300 text-slate-400 hover:border-[#8B0000]'}`}>{num}</button>
                                        ))}
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium">注：NPC 将从真实用户库中随机征召</p>
                                    <button onClick={prepareGame} className="w-full bg-gradient-to-r from-[#8B0000] to-[#600000] text-[#FFD700] py-4 rounded-lg font-bold text-lg shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 border border-[#FFD700]/30">
                                        <Crown className="w-5 h-5" /> 摆驾亲征
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Players & Cards */}
                    {players.map((p, idx) => {
                        const pos = getPlayerPosition(idx, players.length);
                        const isWinner = winner?.id === p.id;
                        const isEmperor = currentEmperor?.id === p.id;
                        const isDealer = idx === dealerIndex;
                        const aiInfo = p.aiLevel ? AI_PROFILES[p.aiLevel] : null;

                        return (
                            <div key={p.id} className="absolute transition-all duration-700 ease-in-out z-20" style={pos}>
                                <div className={`flex flex-col items-center gap-3 relative ${p.hasFolded ? (gamePhase === 'ended' ? 'opacity-80 grayscale' : 'opacity-50 grayscale blur-[1px]') : ''}`}>
                                    
                                    {/* Status Bubble */}
                                    {p.status !== '等待' && (
                                        <div className={`absolute -top-12 whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-black shadow-lg animate-fade-in-up z-30 tracking-wider border-2
                                            ${p.status.includes('输') || p.status.includes('弃') 
                                                ? 'bg-slate-800 text-gray-400 border-slate-600' 
                                                : 'bg-[#FFD700] text-[#8B0000] border-[#B8860B]'}
                                        `}>
                                            {p.status}
                                        </div>
                                    )}

                                    {/* Avatar */}
                                    <div className={`
                                        relative w-20 h-20 md:w-24 md:h-24 rounded-full border-[4px] bg-black shadow-2xl transition-all duration-500
                                        ${p.isTurn ? 'border-[#FFD700] ring-4 ring-[#FFD700]/40 scale-110 shadow-[0_0_30px_#FFD700]' : 'border-[#4a2c2c]'}
                                        ${isWinner ? 'ring-8 ring-[#FFD700] animate-[pulse_1s_infinite]' : ''}
                                    `}>
                                        <img src={p.avatar} className="w-full h-full object-cover rounded-full" />
                                        
                                        {/* Emperor Badge */}
                                        {isEmperor && <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-4xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] z-40 animate-bounce">🐲</div>}
                                        
                                        {/* Dealer Badge */}
                                        {isDealer && (
                                            <div className="absolute -bottom-2 -right-2 bg-blue-700 text-white text-[10px] w-7 h-7 flex items-center justify-center rounded-full border-2 border-white font-bold z-30 shadow-md">
                                                庄
                                            </div>
                                        )}

                                        {/* Turn Timer */}
                                        {p.isTurn && (
                                            <svg className="absolute inset-[-8px] w-[calc(100%+16px)] h-[calc(100%+16px)] animate-[spin_4s_linear_infinite]" viewBox="0 0 100 100">
                                                <circle cx="50" cy="50" r="48" fill="none" stroke="#FFD700" strokeWidth="2" strokeDasharray="20 10" />
                                            </svg>
                                        )}
                                        
                                        {/* AI Level / Real User Badge */}
                                        <div className="absolute -bottom-1 -left-2 bg-black/80 px-1.5 py-0.5 rounded text-[8px] text-white border border-gray-600 flex items-center gap-1">
                                            {p.isRealUser ? <UserCheck className="w-2 h-2 text-green-400" /> : <Brain className="w-2 h-2 text-purple-400" />}
                                            {aiInfo ? `Lv.${p.aiLevel === 'beginner' ? 1 : p.aiLevel === 'intermediate' ? 2 : p.aiLevel === 'advanced' ? 3 : p.aiLevel === 'master' ? 4 : 5}` : 'PLAYER'}
                                        </div>
                                    </div>

                                    {/* Player Info Plate */}
                                    <div className="bg-black/80 backdrop-blur-md border border-[#FFD700]/30 rounded-xl px-4 py-2 text-center min-w-[120px] shadow-lg">
                                        <div className="text-[#FFD700] font-bold text-sm truncate max-w-[100px] mx-auto drop-shadow-md">
                                            {p.name}
                                        </div>
                                        <div className={`text-[10px] font-medium tracking-wide mt-0.5 ${aiInfo ? aiInfo.color : 'text-[#B8860B]'}`}>
                                            {aiInfo ? `${aiInfo.label}` : p.title}
                                        </div>
                                        <div className="flex items-center justify-center gap-1.5 text-xs font-mono text-slate-300 mt-1">
                                            <Coins className="w-3.5 h-3.5 text-[#FFD700]" /> 
                                            <span className={p.chips < ANTE ? 'text-red-500 animate-pulse' : ''}>{p.chips}</span>
                                        </div>
                                    </div>

                                    {/* Cards */}
                                    <div className="flex -space-x-8 mt-2 hover:space-x-1 transition-all cursor-default h-24 items-center">
                                        {p.hand.map((card, cIdx) => (
                                            <div key={card.id} className="transform origin-bottom hover:-translate-y-4 transition-transform z-10 hover:z-20">
                                                {renderCard(card, cIdx, p.isRevealed)}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Bottom Controls Area - UI Fixed & Optimized */}
            
            {/* 1. Gradient Backdrop - Soft & Fixed */}
            <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-10"></div>

            {/* 2. Logs Panel - Bottom Left */}
            <div className="absolute bottom-6 left-6 w-72 h-48 pointer-events-none hidden lg:flex flex-col z-20">
                <div className="flex items-center gap-2 mb-2 pl-1 opacity-90">
                    <History className="w-4 h-4 text-[#FFD700] animate-pulse" />
                    <span className="text-[#FFD700] font-black text-xs tracking-[0.2em] uppercase text-shadow-sm">御前战报</span>
                </div>
                <div className="flex-1 overflow-hidden relative rounded-xl border border-[#FFD700]/20 bg-black/40 backdrop-blur-md">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-0"></div>
                    <div className="relative z-10 flex flex-col justify-end h-full space-y-1.5 pb-2 px-3">
                        {log.slice(-6).map((l, i) => (
                            <div key={i} className="text-xs font-medium text-amber-50 animate-slide-in-up leading-relaxed drop-shadow-sm">
                                <span className="text-[#FFD700]/70 mr-2 text-[10px] opacity-70">{l.split(']')[0] + ']'}</span>
                                <span className="text-amber-50">{l.split(']')[1] || l}</span>
                            </div>
                        ))}
                        <div ref={logEndRef}></div>
                    </div>
                </div>
            </div>

            {/* 3. Main Action Buttons - Bottom Right */}
            {gamePhase !== 'setup' && (
                <div className="absolute bottom-8 right-8 z-50 pointer-events-auto flex flex-col items-end gap-3">
                    {gamePhase === 'ended' ? (
                        <button onClick={() => setGamePhase('setup')} className="bg-gradient-to-r from-[#FFD700] to-[#B8860B] text-[#8B0000] px-12 py-4 rounded-full font-black text-xl shadow-[0_0_40px_rgba(255,215,0,0.6)] hover:scale-105 hover:shadow-[0_0_60px_rgba(255,215,0,0.8)] transition-all flex items-center gap-3 border-2 border-white/20">
                            <Play className="w-6 h-6 fill-current" /> 再战一局
                        </button>
                    ) : (
                        players[0].isTurn ? (
                            <div className="flex flex-col items-end gap-3 animate-slide-in-up">
                                {/* Betting Actions Row */}
                                <div className="flex items-center gap-2">
                                    {roundCount < MAX_ROUNDS && (
                                        <>
                                            <button 
                                                onClick={() => handleAction('user', 'raise')} 
                                                disabled={currentBet >= MAX_BET_LIMIT}
                                                className={`ctrl-btn ${currentBet >= MAX_BET_LIMIT ? 'bg-gray-800 text-gray-500 cursor-not-allowed border-gray-700' : 'bg-[#B8860B] text-white hover:bg-[#a07409] border-[#FFD700] hover:shadow-[0_0_20px_rgba(255,215,0,0.5)]'}`}
                                            >
                                                <ArrowRightCircle className="w-5 h-5" /> 加注
                                            </button>
                                            <button onClick={() => handleAction('user', 'call')} className="ctrl-btn bg-green-900 text-green-100 hover:bg-green-800 border-green-600 hover:shadow-[0_0_20px_rgba(22,163,74,0.5)]"><HandMetal className="w-5 h-5" /> 跟注</button>
                                        </>
                                    )}
                                </div>
                                
                                {/* Strategic Actions Row */}
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleAction('user', 'fold')} className="ctrl-btn bg-slate-800 text-slate-400 hover:bg-slate-700 border-slate-600 hover:text-white"><XCircle className="w-5 h-5" /> 弃牌</button>
                                    
                                    <button 
                                        onClick={() => handleAction('user', 'look')} 
                                        className={`ctrl-btn ${players[0].isRevealed ? 'bg-gray-700 text-gray-400 border-gray-600 cursor-not-allowed' : 'bg-blue-900 text-blue-100 hover:bg-blue-800 border-blue-600 hover:shadow-[0_0_20px_rgba(59,130,246,0.5)]'}`}
                                        disabled={players[0].isRevealed} 
                                    >
                                        {players[0].isRevealed ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />} 
                                        {players[0].hasSeen ? (players[0].isRevealed ? '已看牌' : '回看') : '看牌'}
                                    </button>
                                    
                                    <button onClick={() => handleAction('user', 'compare')} className="ctrl-btn bg-red-900 text-red-100 hover:bg-red-800 border-red-600 hover:shadow-[0_0_20px_rgba(220,38,38,0.5)]"><ShieldAlert className="w-5 h-5" /> 比牌</button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 text-[#FFD700] font-bold text-base bg-black/60 backdrop-blur px-8 py-3 rounded-full border border-[#FFD700]/30 animate-pulse shadow-lg">
                                <Sparkles className="w-5 h-5 animate-spin-slow" /> 等待诸侯决策...
                            </div>
                        )
                    )}
                </div>
            )}

            <style>{`
                .ctrl-btn { @apply px-6 py-3.5 rounded-2xl font-bold flex items-center gap-2 shadow-xl transition-all active:scale-95 text-sm min-w-[90px] border-b-4 border-r-2 active:border-b-0 active:border-r-0 active:translate-y-1; }
                .transform-style-3d { transform-style: preserve-3d; }
                .backface-hidden { backface-visibility: hidden; }
                @keyframes float-dust {
                    0% { transform: translateY(0) translateX(0); opacity: 0; }
                    50% { opacity: 0.6; }
                    100% { transform: translateY(-100px) translateX(20px); opacity: 0; }
                }
            `}</style>
        </div>
    );
};
