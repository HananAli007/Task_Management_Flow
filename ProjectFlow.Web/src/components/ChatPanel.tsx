import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Send, MessageCircle, Loader2, Paperclip, Image as ImageIcon, 
  FileText, Download, Maximize2, Minimize2, Smile, Phone, PhoneOff, 
  Mic, Square, Volume2, VolumeX, Play, Pause, RefreshCw, Trash2
} from 'lucide-react';
import { User } from '@/lib/api/users';
import { chatApi, ChatMessage } from '@/lib/api/chat';
import { useSignalR } from '@/hooks/useSignalR';
import { useSignalRContext } from '@/context/SignalRContext';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { useThemeStore } from '@/store/useThemeStore';
import { useChatStore } from '@/store/useChatStore';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from 'sonner';

interface ChatPanelProps {
  user: User;
  onClose: () => void;
}

// Helper to normalize absolute upload URLs to relative paths.
// This resolves CORS, HTTPS -> HTTP Mixed Content blocks and port 8080 exposure issues.
const cleanAttachmentUrl = (url: string | undefined): string => {
  if (!url) return '';
  if (url.includes('/uploads/')) {
    const parts = url.split('/uploads/');
    return `/uploads/${parts[1]}`;
  }
  return url;
};

// Trig-based dynamic visual static waveform subcomponent
const VoicePlayer: React.FC<{ url: string; isMe: boolean }> = ({ url, isMe }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(url);
    audioRef.current = audio;
    
    const onLoadedMetadata = () => setDuration(audio.duration || 8);
    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / (audio.duration || 8)) * 100);
    };
    const onEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, [url]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(err => console.error(err));
      setIsPlaying(true);
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="p-3.5 flex items-center gap-3.5 min-w-[220px]">
      <button 
        type="button"
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
          isMe 
            ? 'bg-white text-blue-600 hover:scale-105 active:scale-95' 
            : 'bg-blue-600 text-white hover:scale-105 active:scale-95'
        }`}
      >
        {isPlaying ? (
          <Pause size={14} className="fill-current" />
        ) : (
          <Play size={14} className="fill-current ml-0.5" />
        )}
      </button>
      
      <div className="flex-1 space-y-1 min-w-0">
        <div className="flex items-center gap-[3px] h-6">
          {Array.from({ length: 20 }).map((_, i) => {
            const barHeight = Math.abs(Math.sin(i * 0.5)) * 14 + 4;
            const filled = (i / 20) * 100 <= progress;
            return (
              <div 
                key={i} 
                className={`w-[3px] rounded-full transition-all duration-300 ${
                  isPlaying ? 'animate-pulse' : ''
                } ${
                  filled 
                    ? isMe ? 'bg-white' : 'bg-blue-500' 
                    : isMe ? 'bg-white/30' : 'bg-slate-300 dark:bg-white/20'
                }`}
                style={{ 
                  height: `${barHeight}px`,
                  animationDelay: isPlaying ? `${i * 0.05}s` : undefined 
                }}
              />
            );
          })}
        </div>
        
        <div className="flex justify-between text-[9px] opacity-75 font-semibold">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
};

const MessageContent: React.FC<{ content: string; isMe: boolean }> = ({ content, isMe }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLong = content.length > 250;
  
  const displayedContent = isLong && !isExpanded 
    ? `${content.substring(0, 250)}...` 
    : content;
    
  return (
    <div className="px-4 py-2.5 select-text">
      <p className="text-[13px] leading-relaxed break-words whitespace-pre-wrap selection:bg-blue-500/30 dark:selection:bg-blue-500/40">
        {displayedContent}
      </p>
      {isLong && (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className={`text-[11px] font-black mt-1.5 transition-colors uppercase tracking-wider block ${
            isMe 
              ? 'text-white/80 hover:text-white hover:underline' 
              : 'text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline'
          }`}
        >
          {isExpanded ? 'Show Less' : 'Read More'}
        </button>
      )}
    </div>
  );
};

const createVirtualAudioStream = (): MediaStream => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();
    const dest = ctx.createMediaStreamDestination();
    
    // Generate an extremely low gain oscillation to ensure active stream track output
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0.001; 
    osc.connect(gain);
    gain.connect(dest);
    osc.start();
    
    return dest.stream;
  } catch (e) {
    console.error("Virtual audio stream fallback failed:", e);
    return new MediaStream();
  }
};

export const ChatPanel: React.FC<ChatPanelProps> = ({ user, onClose }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const { getDraft: getDraftFn, setDraft: setDraftFn, clearDraft: clearDraftFn } = useChatStore();
  const [inputValue, setInputValue] = useState(() => getDraftFn(user.id));
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { onlineUsers, markAsRead, connection, sendTypingStatus } = useSignalRContext();
  const { theme } = useThemeStore();
  const isDarkMode = theme === 'dark';
  const isOnline = onlineUsers.has(user.id.toLowerCase());
  const { addCallLog, callHistory, getDraft, setDraft, clearDraft } = useChatStore();

  // Voice Note Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const recordIntervalRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Typing Status States
  const [partnerTypingState, setPartnerTypingState] = useState<{ isTyping: boolean; isRecording: boolean }>({ isTyping: false, isRecording: false });
  const [amTyping, setAmTyping] = useState(false);
  const amTypingTimeoutRef = useRef<any>(null);

  // Audio Preview States
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Voice Call States
  const [callState, setCallState] = useState<'idle' | 'dialing' | 'ringing' | 'connected' | 'onhold' | 'ended'>('idle');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showHistoryTab, setShowHistoryTab] = useState(false);
  const callTimerRef = useRef<any>(null);

  // Web Audio Synth References
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ringOsc1Ref = useRef<OscillatorNode | null>(null);
  const ringOsc2Ref = useRef<OscillatorNode | null>(null);
  const ringGainRef = useRef<GainNode | null>(null);

  // WebRTC & Audio Refs
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const startRingingSynth = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc1.frequency.value = 440;
      osc2.frequency.value = 480;
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      
      // Simulate ring schedule
      let now = ctx.currentTime;
      for (let i = 0; i < 15; i++) {
        gain.gain.setValueAtTime(0.2, now + i * 4);
        gain.gain.setValueAtTime(0, now + i * 4 + 1.5);
      }
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      
      osc1.start();
      osc2.start();
      
      ringOsc1Ref.current = osc1;
      ringOsc2Ref.current = osc2;
      ringGainRef.current = gain;
    } catch (e) {
      console.error("Audio Synthesis error", e);
    }
  };

  const stopRingingSynth = () => {
    try {
      if (ringOsc1Ref.current) {
        ringOsc1Ref.current.stop();
        ringOsc1Ref.current = null;
      }
      if (ringOsc2Ref.current) {
        ringOsc2Ref.current.stop();
        ringOsc2Ref.current = null;
      }
    } catch (e) {
      console.error(e);
    }
  };

  const playBeepSynth = (freq = 400, duration = 0.15) => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.error(e);
    }
  };

  const createPeerConnection = (targetUserId: string) => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    const iceServers: RTCIceServer[] = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ];

    const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
    const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME;
    const turnCredential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;

    if (turnUrl) {
      iceServers.push({
        urls: turnUrl,
        username: turnUsername,
        credential: turnCredential
      });
    }

    const pc = new RTCPeerConnection({ iceServers });

    pc.onicecandidate = (event) => {
      if (event.candidate && connection) {
        connection.invoke('SendIceCandidate', targetUserId, JSON.stringify(event.candidate)).catch(console.error);
      }
    };

    pc.ontrack = (event) => {
      console.log('WebRTC Track: Received remote audio track', event.streams[0]);
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  };

  // Trigger outbound call
  const initiateCall = async () => {
    let stream: MediaStream;
    try {
      playBeepSynth(600, 0.1);
      setCallState('dialing');
      
      // 1. Get user media (microphone access)
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
    } catch (err: any) {
      console.warn("Physical microphone access failed. Falling back to Virtual Audio Stream:", err);
      
      // Generate virtual silent fallback stream so the call can still connect for testing!
      stream = createVirtualAudioStream();
      localStreamRef.current = stream;

      toast.info("Using Virtual Microphone", {
        description: "No physical microphone detected or permission denied. Silent fallback stream active.",
        duration: 7000,
        position: "top-center"
      });
    }

    try {
      // 2. Create peer connection
      const pc = createPeerConnection(user.id);

      // 3. Add tracks
      stream.getTracks().forEach(track => {
        try {
          pc.addTrack(track, stream);
        } catch (e) {
          console.warn("Track addition warning:", e);
        }
      });

      // 4. Create offer
      const offer = await pc.createOffer({
        offerToReceiveAudio: true
      });
      await pc.setLocalDescription(offer);

      // 5. Send Offer over SignalR Hub
      if (connection) {
        const myName = useAuthStore.getState().user?.name || "Someone";
        await connection.invoke('InitiateCall', user.id, offer.sdp, myName);
      }

      startRingingSynth();
      
      // Automatically transition to ringing state
      setTimeout(() => {
        setCallState('ringing');
      }, 2000);

    } catch (pcErr) {
      console.error("WebRTC peer connection setup failed:", pcErr);
      toast.error("Call Setup Failed", {
        description: "Failed to establish WebRTC peer connection.",
        position: "top-center"
      });
      setCallState('idle');
      hangUpCall(false);
    }
  };

  // Accept Inbound WebRTC Audio Call
  const acceptIncomingCallFlow = async (callerId: string, sdpOffer: string) => {
    let stream: MediaStream;
    try {
      playBeepSynth(600, 0.1);
      setCallState('connected');

      // 1. Get user media
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
    } catch (err: any) {
      console.warn("Physical microphone access failed. Falling back to Virtual Audio Stream:", err);
      
      // Generate virtual silent fallback stream so the call can still connect for testing!
      stream = createVirtualAudioStream();
      localStreamRef.current = stream;

      toast.info("Using Virtual Microphone", {
        description: "No physical microphone detected or permission denied. Silent fallback stream active.",
        duration: 7000,
        position: "top-center"
      });
    }

    try {
      // 2. Create peer connection
      const pc = createPeerConnection(callerId);

      // 3. Add tracks
      stream.getTracks().forEach(track => {
        try {
          pc.addTrack(track, stream);
        } catch (e) {
          console.warn("Track addition warning:", e);
        }
      });

      // 4. Set remote offer
      await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: sdpOffer }));

      // 5. Create answer
      const answer = await pc.createAnswer({
        offerToReceiveAudio: true
      });
      await pc.setLocalDescription(answer);

      // 6. Send Answer over SignalR Hub
      if (connection) {
        await connection.invoke('AcceptCall', callerId, answer.sdp);
      }

      // Start timer
      setCallDuration(0);
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);

    } catch (pcErr) {
      console.error("WebRTC incoming setup failed:", pcErr);
      toast.error("Call Setup Failed", {
        description: "Failed to establish WebRTC peer connection.",
        position: "top-center"
      });
      hangUpCall(false);
    }
  };

  // Handle call accepted by receiver (SDP Answer)
  const handleInboundCallAccepted = async (sdpAnswer: string) => {
    try {
      stopRingingSynth();
      setCallState('connected');
      playBeepSynth(800, 0.2);

      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: sdpAnswer }));
      }

      setCallDuration(0);
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("WebRTC answer processing failed:", err);
      hangUpCall(false);
    }
  };

  // Handle ICE Candidate from other peer
  const handleInboundIceCandidate = async (candidateJson: string) => {
    try {
      if (peerConnectionRef.current) {
        const candidate = new RTCIceCandidate(JSON.parse(candidateJson));
        await peerConnectionRef.current.addIceCandidate(candidate);
      }
    } catch (err) {
      console.error("WebRTC add ICE candidate failed:", err);
    }
  };

  // Hang Up Call
  const hangUpCall = (notifyPeer = true) => {
    stopRingingSynth();
    clearInterval(callTimerRef.current);
    playBeepSynth(300, 0.3);

    // Close WebRTC Peer Connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Stop microphone stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    // Notify peer via SignalR
    if (notifyPeer && connection) {
      connection.invoke('HangUpCall', user.id).catch(console.error);
    }

    // Log call and send message to database (only if we actually established or placed a call)
    if (callState !== 'idle' && callState !== 'ended') {
      const mins = Math.floor(callDuration / 60);
      const secs = callDuration % 60;
      const durationStr = callDuration > 0 ? `${mins}:${secs < 10 ? '0' : ''}${secs}` : undefined;
      
      const content = callDuration > 0 
        ? `Call Connected — Duration: ${durationStr}` 
        : callState === 'dialing' || callState === 'ringing' 
          ? "Missed Voice Call" 
          : "Declined Voice Call";

      // Save to local call history
      addCallLog({
        userId: user.id,
        userName: user.name,
        avatarUrl: user.avatar_url,
        type: callDuration > 0 ? 'outgoing' : 'missed',
        duration: durationStr,
      });

      // Persist call log event into chat database so both users can see it!
      sendMessage(user.id, content, null, "call").catch(console.error);
    }

    setCallState('ended');
    setTimeout(() => {
      setCallState('idle');
      setCallDuration(0);
    }, 1500);
  };

  const toggleHold = () => {
    if (callState === 'connected') {
      playBeepSynth(450, 0.1);
      setCallState('onhold');
      clearInterval(callTimerRef.current);
    } else if (callState === 'onhold') {
      playBeepSynth(550, 0.1);
      setCallState('connected');
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
  };

  const handleNewMessage = React.useCallback((message: any) => {
    const sId = (message.senderId || message.sender_id)?.toLowerCase();
    const rId = (message.receiverId || message.receiver_id)?.toLowerCase();
    const targetId = user.id.toLowerCase();

    if (sId === targetId || rId === targetId) {
      setMessages(prev => {
        const mId = message.id;
        if (prev.some(m => m.id === mId)) return prev;
        return [...prev, message];
      });
      if (sId === targetId) {
        markAsRead(targetId);
      }
    }
  }, [user.id, markAsRead]);

  const { sendMessage, isConnected } = useSignalR(handleNewMessage);

  useEffect(() => {
    const targetId = user.id.toLowerCase();
    window.dispatchEvent(new CustomEvent('chat-opened', { detail: { userId: targetId } }));
    markAsRead(targetId);

    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);

    const fetchHistory = async () => {
      try {
        const history = await chatApi.getConversation(user.id);
        setMessages(history);
      } catch (err) {
        console.error('Failed to fetch chat history:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();

    const handleTriggerCall = () => {
      initiateCall();
    };
    window.addEventListener('initiate-outbound-call', handleTriggerCall);

    // WebRTC Accept/Reject/Ended Window Listeners
    const handleWebRtcAccept = (e: any) => {
      const { callerId, sdpOffer } = e.detail;
      if (callerId.toLowerCase() === targetId) {
        acceptIncomingCallFlow(callerId, sdpOffer);
      }
    };

    const handleWebRtcEnded = (e: any) => {
      const { peerId } = e.detail;
      if (peerId.toLowerCase() === targetId) {
        hangUpCall(false);
      }
    };

    const handleWebRtcRejected = (e: any) => {
      const { peerId } = e.detail;
      if (peerId.toLowerCase() === targetId) {
        stopRingingSynth();
        clearInterval(callTimerRef.current);
        playBeepSynth(300, 0.3);
        setCallState('ended');
        setTimeout(() => {
          setCallState('idle');
          setCallDuration(0);
        }, 1500);
      }
    };

    const handleUserTypingStatus = (e: any) => {
      const { senderId, isTyping, isRecording } = e.detail;
      if (senderId === targetId) {
        setPartnerTypingState({ isTyping, isRecording });
      }
    };

    window.addEventListener('webrtc-accept-call', handleWebRtcAccept);
    window.addEventListener('webrtc-call-ended', handleWebRtcEnded);
    window.addEventListener('webrtc-call-rejected', handleWebRtcRejected);
    window.addEventListener('user-typing-status', handleUserTypingStatus);

    // Direct SignalR Hub Listeners inside active ChatPanel
    if (connection) {
      connection.on('CallAccepted', (receiverId: string, sdpAnswer: string) => {
        if (receiverId.toLowerCase() === targetId) {
          handleInboundCallAccepted(sdpAnswer);
        }
      });

      connection.on('CallRejected', (receiverId: string, reason: string) => {
        if (receiverId.toLowerCase() === targetId) {
          stopRingingSynth();
          setCallState('ended');
          playBeepSynth(300, 0.3);
          setTimeout(() => {
            setCallState('idle');
            setCallDuration(0);
          }, 1500);
        }
      });

      connection.on('ReceiveIceCandidate', (senderId: string, candidateJson: string) => {
        if (senderId.toLowerCase() === targetId) {
          handleInboundIceCandidate(candidateJson);
        }
      });

      connection.on('CallEnded', (senderId: string) => {
        if (senderId.toLowerCase() === targetId) {
          hangUpCall(false);
        }
      });
    }

    return () => {
      window.dispatchEvent(new CustomEvent('chat-closed'));
      window.removeEventListener('initiate-outbound-call', handleTriggerCall);
      window.removeEventListener('webrtc-accept-call', handleWebRtcAccept);
      window.removeEventListener('webrtc-call-ended', handleWebRtcEnded);
      window.removeEventListener('webrtc-call-rejected', handleWebRtcRejected);
      window.removeEventListener('user-typing-status', handleUserTypingStatus);
      
      stopRingingSynth();
      clearInterval(callTimerRef.current);

      if (connection) {
        connection.off('CallAccepted');
        connection.off('CallRejected');
        connection.off('ReceiveIceCandidate');
        connection.off('CallEnded');
      }
    };
  }, [user.id, connection]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, showHistoryTab]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Synchronize draft value to store on every change of inputValue
  useEffect(() => {
    setDraftFn(user.id, inputValue);
  }, [inputValue, user.id, setDraftFn]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || !isConnected) return;
    
    const content = inputValue.trim();
    setInputValue('');
    clearDraftFn(user.id);
    setShowEmojiPicker(false);

    try {
      await sendMessage(user.id, content);
    } catch (err) {
      console.error('Failed to send message:', err);
      setInputValue(content);
      setDraftFn(user.id, content);
      toast.error('Failed to send message. Please try again.');
    }
  };

  const onEmojiClick = (emojiData: any) => {
    setInputValue(prev => prev + emojiData.emoji);
  };

  // Ctrl+V Image Paste Handler
  const handlePaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items;
    if (!items || !isConnected) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) return;

        setIsUploading(true);
        try {
          const data = await chatApi.uploadFile(file);
          await sendMessage(user.id, 'Sent an image', data.url, 'image');
        } catch (err) {
          console.error('Paste image upload failed:', err);
          toast.error('Failed to paste and upload image.');
        } finally {
          setIsUploading(false);
        }
        return; // Only handle the first image
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isConnected) return;

    setIsUploading(true);
    try {
      const data = await chatApi.uploadFile(file);
      const messageType = data.file_type === 'image' ? 'image' : 'file';
      await sendMessage(user.id, `Sent a ${messageType}`, data.url, messageType);
    } catch (err) {
      console.error('File upload failed:', err);
      alert('Failed to upload file.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Mic audio recording triggers
  const startRecordingFlow = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Proper REST API File Upload
        try {
          const audioFile = new File([audioBlob], `voice_note_${Date.now()}.webm`, { type: 'audio/webm' });
          const uploadResult = await chatApi.uploadFile(audioFile);
          
          if (isConnected && uploadResult && uploadResult.url) {
            await sendMessage(user.id, "[Voice Note]", uploadResult.url, "voice");
          }
        } catch (uploadErr) {
          console.error("Failed to upload voice note:", uploadErr);
          toast.error("Failed to send voice note.");
        }

        stream.getTracks().forEach(track => track.stop());
      };

      // Start recording with 250ms timeslice so chunks are populated continuously for preview!
      mediaRecorder.start(250);
      setIsRecording(true);
      setIsRecordingPaused(false);
      setRecordDuration(0);
      recordIntervalRef.current = setInterval(() => {
        setRecordDuration(prev => prev + 1);
      }, 1000);
      playBeepSynth(500, 0.08);

      // Send recording status over SignalR
      sendTypingStatus(user.id, false, true);
    } catch (err) {
      console.error("Microphone access denied:", err);
      alert("Could not activate microphone.");
    }
  };

  const pauseRecordingFlow = () => {
    if (!mediaRecorderRef.current || !isRecording) return;
    if (mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsRecordingPaused(true);
      clearInterval(recordIntervalRef.current);
      playBeepSynth(350, 0.08);

      // Send typing/recording status over SignalR (reset)
      sendTypingStatus(user.id, false, false);

      // Create preview url from chunks collected so far
      if (audioChunksRef.current.length > 0) {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      }
    }
  };

  const resumeRecordingFlow = () => {
    if (!mediaRecorderRef.current || !isRecording) return;
    
    // Stop and clean up preview if it was playing
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    setIsPreviewPlaying(false);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }

    if (mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsRecordingPaused(false);
      recordIntervalRef.current = setInterval(() => {
        setRecordDuration(prev => prev + 1);
      }, 1000);
      playBeepSynth(450, 0.08);

      // Send recording status over SignalR
      sendTypingStatus(user.id, false, true);
    }
  };

  const togglePreviewPlay = () => {
    if (!previewUrl) return;

    if (previewAudioRef.current && isPreviewPlaying) {
      previewAudioRef.current.pause();
      setIsPreviewPlaying(false);
    } else {
      const audio = previewAudioRef.current || new Audio(previewUrl);
      previewAudioRef.current = audio;
      audio.play().then(() => {
        setIsPreviewPlaying(true);
      }).catch(err => {
        console.error("Preview play failed:", err);
      });
      audio.onended = () => {
        setIsPreviewPlaying(false);
      };
    }
  };

  const stopRecordingFlow = (shouldSend = true) => {
    if (!mediaRecorderRef.current || !isRecording) return;
    
    // Stop and clean up preview
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    setIsPreviewPlaying(false);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }

    clearInterval(recordIntervalRef.current);
    setIsRecording(false);
    setIsRecordingPaused(false);
    playBeepSynth(400, 0.08);

    // Send typing/recording status over SignalR (reset)
    sendTypingStatus(user.id, false, false);
    
    if (shouldSend) {
      mediaRecorderRef.current.stop();
    } else {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    
    // Send typing status
    if (!amTyping) {
      setAmTyping(true);
      sendTypingStatus(user.id, true, false);
    }
    
    // Reset/Debounce typing status timeout
    if (amTypingTimeoutRef.current) {
      clearTimeout(amTypingTimeoutRef.current);
    }
    amTypingTimeoutRef.current = setTimeout(() => {
      setAmTyping(false);
      sendTypingStatus(user.id, false, false);
    }, 2500); // 2.5 seconds timeout of no typing
  };

  const formatTimerStr = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = time % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className={`absolute transition-all duration-500 ease-in-out flex flex-col shadow-[0_25px_60px_rgba(0,0,0,0.45)] z-[1000] overflow-hidden border border-slate-200 dark:border-white/10 ${
      isFullScreen 
        ? 'inset-0 md:inset-4 w-auto h-auto' 
        : 'bottom-6 right-6 w-[340px] h-[500px] animate-in slide-in-from-bottom-8'
    }`} 
    style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: isFullScreen ? '16px' : '24px' }}>
      
      <audio ref={remoteAudioRef} autoPlay className="hidden" />
      
      {/* Voice Dialer overlay UI */}
      {callState !== 'idle' && (
        <div 
          className="absolute inset-0 z-[1002] flex flex-col justify-between p-6 text-white animate-in fade-in slide-in-from-bottom-12 duration-300"
          style={{ backgroundColor: '#0c0d1b' }}
        >
          <div className="text-center space-y-2 pt-6">
            {/* Pulsing Avatar Container */}
            <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
              <div className={`absolute inset-0 rounded-full bg-blue-500/20 animate-ping duration-1000 ${callState === 'connected' ? 'hidden' : ''}`} />
              <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xl font-bold shadow-2xl ring-4 ring-white/10">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="w-full h-full rounded-3xl object-cover" />
                ) : (
                  user.name.substring(0, 2).toUpperCase()
                )}
              </div>
            </div>

            <div className="space-y-1">
              <h4 className="text-lg font-bold tracking-tight">{user.name}</h4>
              <p className="text-xs uppercase tracking-widest text-blue-400 font-bold animate-pulse">
                {callState === 'dialing' ? 'Dialing...' : 
                 callState === 'ringing' ? 'Ringing...' :
                 callState === 'onhold' ? 'Call on Hold' :
                 callState === 'ended' ? 'Call Ended' : 'Voice Connected'}
              </p>
            </div>
            
            {/* Visualizer audio waves when connected */}
            {callState === 'connected' && (
              <div className="flex items-center justify-center gap-1.5 h-8 pt-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div 
                    key={i}
                    className="w-1 bg-gradient-to-t from-blue-500 to-cyan-400 rounded-full animate-bounce duration-500"
                    style={{ 
                      height: `${Math.random() * 20 + 8}px`,
                      animationDelay: `${i * 0.15}s` 
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="text-center font-mono text-3xl tracking-widest font-bold opacity-90 py-2">
            {formatTimerStr(callDuration)}
          </div>

          <div className="flex flex-col gap-4 items-center pb-4">
            <div className="flex items-center gap-6 justify-center">
              {/* Mute Button */}
              <div className="flex flex-col items-center gap-2">
                <button 
                  type="button"
                  onClick={() => setIsMuted(!isMuted)}
                  title={isMuted ? "Unmute Call" : "Mute Call"}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all border-2 shadow-lg ${
                    isMuted 
                      ? 'bg-red-500 border-red-400 text-white hover:bg-red-600 hover:scale-105 active:scale-95' 
                      : 'bg-slate-800/90 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white hover:scale-105 active:scale-95'
                  }`}
                >
                  {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {isMuted ? 'Muted' : 'Mute'}
                </span>
              </div>
              
              {/* Hold Button */}
              <div className="flex flex-col items-center gap-2">
                <button 
                  type="button"
                  onClick={toggleHold}
                  disabled={callState === 'dialing' || callState === 'ringing' || callState === 'ended'}
                  title={callState === 'onhold' ? "Resume Call" : "Hold Call"}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all border-2 shadow-lg ${
                    callState === 'onhold'
                      ? 'bg-amber-500 border-amber-400 text-black hover:bg-amber-600 hover:scale-105 active:scale-95'
                      : 'bg-slate-800/90 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white disabled:bg-slate-900/60 disabled:border-slate-850 disabled:text-slate-600 disabled:scale-100 disabled:opacity-40 hover:scale-105 active:scale-95'
                  }`}
                >
                  {callState === 'onhold' ? <Play size={20} /> : <Pause size={20} />}
                </button>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                  callState === 'dialing' || callState === 'ringing' || callState === 'ended' 
                    ? 'text-slate-600' 
                    : 'text-slate-400'
                }`}>
                  {callState === 'onhold' ? 'Resume' : 'Hold'}
                </span>
              </div>
            </div>

            {/* End Call Button */}
            <div className="flex flex-col items-center gap-2">
              <button 
                type="button"
                onClick={() => hangUpCall()}
                title="Hang up"
                className="w-14 h-14 bg-red-600 hover:bg-red-500 border-2 border-red-500 rounded-full flex items-center justify-center transition-all text-white shadow-xl shadow-red-600/30 hover:scale-110 active:scale-95"
              >
                <PhoneOff size={24} />
              </button>
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">End Call</span>
            </div>
          </div>
        </div>
      )}

      {/* Premium Header */}
      <div className="p-4 border-b flex items-center justify-between bg-[var(--bg-secondary)]" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-blue-500/20">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-full h-full rounded-2xl object-cover" />
              ) : (
                user.name.substring(0, 2).toUpperCase()
              )}
            </div>
            <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 border-2 rounded-full shadow-sm transition-colors duration-500 ${isOnline ? 'bg-green-500' : 'bg-slate-400'}`} style={{ borderColor: 'var(--bg-secondary)' }} />
          </div>
          <div>
            <h3 className="text-sm font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>{user.name}</h3>
            <p className="text-[10px] font-bold tracking-wide mt-0.5 transition-all" style={{ color: partnerTypingState.isTyping || partnerTypingState.isRecording ? '#3b82f6' : 'var(--text-muted)' }}>
              {partnerTypingState.isRecording ? (
                <span className="flex items-center gap-1 animate-pulse">
                  <Mic size={10} /> recording audio...
                </span>
              ) : partnerTypingState.isTyping ? (
                <span className="animate-pulse">typing...</span>
              ) : isOnline ? (
                'Active Now'
              ) : (
                'Offline'
              )}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* History / Chat Tab Switcher */}
          <button
            onClick={() => setShowHistoryTab(!showHistoryTab)}
            className={`px-3 py-1.5 rounded-xl transition-all text-[11px] font-black tracking-wide ${
              showHistoryTab 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                : 'text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
            title="Call Logs History"
          >
            Calls
          </button>
          
          <button 
            onClick={initiateCall} 
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-emerald-500/15 hover:text-emerald-500 transition-all text-slate-400 hover:scale-105 active:scale-95"
            title="Start Audio Call"
          >
            <Phone size={17} />
          </button>
          
          <button 
            onClick={() => setIsFullScreen(!isFullScreen)} 
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-all text-slate-400 hover:scale-105 active:scale-95"
            title={isFullScreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullScreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
          </button>
          
          <button 
            onClick={onClose} 
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-red-500/15 hover:text-red-500 transition-all text-slate-400 hover:scale-105 active:scale-95"
            title="Close Chat"
          >
            <X size={17} />
          </button>
        </div>
      </div>

      {/* Messages / Call History Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar bg-[var(--bg-secondary)]">
        {showHistoryTab ? (
          /* Calling History list */
          <div className="space-y-4 py-2 animate-in fade-in duration-300">
            <h4 className="text-[10px] font-bold uppercase tracking-wider opacity-60 text-slate-400">Calling History</h4>
            {callHistory.filter(c => c.userId?.toLowerCase() === user.id?.toLowerCase()).length === 0 ? (
              <div className="text-center py-12 opacity-30 text-xs">
                No recent calls recorded.
              </div>
            ) : (
              callHistory.filter(c => c.userId?.toLowerCase() === user.id?.toLowerCase()).map(log => (
                <div key={log.id} className="flex items-center justify-between p-3.5 bg-black/5 dark:bg-white/[0.02] border border-black/5 dark:border-white/5 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${log.type === 'missed' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                      <Phone size={14} className={log.type === 'missed' ? 'rotate-[135deg]' : ''} />
                    </div>
                    <div>
                      <p className="text-xs font-bold capitalize">{log.type} Call</p>
                      <p className="text-[9px] text-slate-400 font-medium">{new Date(log.timestamp).toLocaleDateString()} at {new Date(log.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
                    </div>
                  </div>
                  {log.duration && (
                    <span className="text-[10px] font-semibold opacity-60 font-mono">{log.duration}</span>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          /* Normal Chat conversation */
          isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="animate-spin text-blue-500" size={24} />
                <p className="text-[10px] font-medium text-blue-500/50 uppercase tracking-widest">Loading Chat</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-20 text-center space-y-3">
              <div className="p-4 bg-slate-500/10 rounded-full">
                <MessageCircle size={40} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold">Say Hello!</p>
                <p className="text-[10px]">Start a conversation with {user.name.split(' ')[0]}</p>
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const senderId = msg.senderId || msg.sender_id || msg.SenderId;
              const isMe = senderId?.toLowerCase() !== user.id?.toLowerCase();
              const time = msg.sentAt || msg.sent_at || msg.SentAt;
              const type = msg.messageType || msg.message_type || msg.MessageType || 'text';
              const url = msg.attachmentUrl || msg.attachment_url || msg.AttachmentUrl;
              const content = msg.content || msg.Content || '';
              
              return (
                <div key={msg.id || msg.Id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[85%] shadow-sm overflow-hidden ${
                    isMe 
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl rounded-tr-none' 
                      : 'bg-slate-100 dark:bg-white/5 text-current rounded-2xl rounded-tl-none border border-black/5 dark:border-white/5'
                  }`}>
                    {type === 'image' && url ? (
                      <div className="p-1">
                        <img src={cleanAttachmentUrl(url)} alt="attachment" className="rounded-xl max-h-60 w-full object-cover cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(cleanAttachmentUrl(url))} />
                      </div>
                    ) : type === 'file' && url ? (
                      <div className="p-3 flex items-center gap-3 min-w-[150px]">
                        <div className="p-2 bg-black/10 rounded-lg">
                          <FileText size={20} />
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="text-[11px] font-bold truncate">File Attachment</p>
                          <a href={cleanAttachmentUrl(url)} target="_blank" className="text-[9px] opacity-70 flex items-center gap-1 hover:underline">
                            <Download size={10} /> Download
                          </a>
                        </div>
                      </div>
                    ) : type === 'voice' ? (
                      /* Stunning Dynamic Voice Player */
                      <VoicePlayer url={cleanAttachmentUrl(url || content)} isMe={isMe} />
                    ) : type === 'call' ? (
                      <div className="p-3.5 flex items-center gap-3 min-w-[200px]">
                        <div className={`p-2.5 rounded-xl ${
                          content.includes("Missed") || content.includes("Declined") 
                            ? 'bg-red-500/10 text-red-500' 
                            : 'bg-green-500/10 text-green-500'
                        }`}>
                          <Phone size={16} className={content.includes("Missed") ? 'rotate-[135deg]' : ''} />
                        </div>
                        <div>
                          <p className="text-xs font-bold">{content}</p>
                          <p className="text-[9px] opacity-70">Voice Call</p>
                        </div>
                      </div>
                    ) : (
                      <MessageContent content={content} isMe={isMe} />
                    )}
                  </div>
                  <span className="text-[9px] mt-1.5 px-1 font-medium opacity-40 uppercase tracking-tighter">
                    {time ? new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                  </span>
                </div>
              );
            })
          )
        )}
      </div>

      {/* Input Area */}
      {!showHistoryTab && (
        <div className="p-4 bg-[var(--bg-secondary)] relative border-t border-black/5 dark:border-white/5">
          {showEmojiPicker && (
            <div ref={emojiRef} className="absolute bottom-full right-4 mb-2 z-[1001]">
              <EmojiPicker 
                theme={isDarkMode ? Theme.DARK : Theme.LIGHT}
                onEmojiClick={onEmojiClick}
                autoFocusSearch={false}
                width={300}
                height={400}
              />
            </div>
          )}

          {isRecording ? (
            /* Audio voice recording wave UI animation */
            <div className="flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded-2xl p-2.5 shadow-md animate-in slide-in-from-bottom-6">
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${isRecordingPaused ? 'bg-amber-500' : 'bg-red-500 animate-pulse'}`} />
                <span className="text-xs font-bold text-red-500 font-mono">
                  {formatTimerStr(recordDuration)}
                </span>
                
                {/* Visual sound waveform simulation */}
                <div className="flex items-center gap-1 h-4">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div 
                      key={i}
                      className="w-[2.5px] bg-red-400 rounded-full"
                      style={{ 
                        height: isRecordingPaused ? '4px' : `${Math.random() * 10 + 4}px`,
                        animationName: isRecordingPaused ? 'none' : 'bounce',
                        animationDuration: '0.6s',
                        animationIterationCount: 'infinite',
                        animationDelay: `${i * 0.08}s` 
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Discard recording */}
                <button 
                  type="button" 
                  onClick={() => stopRecordingFlow(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-all"
                  title="Discard Recording"
                >
                  <Trash2 size={16} />
                </button>

                {/* Preview Play/Pause when paused */}
                {isRecordingPaused && previewUrl && (
                  <button 
                    type="button"
                    onClick={togglePreviewPlay}
                    className={`p-2 rounded-xl transition-all bg-emerald-500 hover:bg-emerald-600 text-white shadow-md flex items-center justify-center`}
                    title={isPreviewPlaying ? "Pause Preview" : "Listen Preview"}
                  >
                    {isPreviewPlaying ? <Pause size={16} /> : <Play size={16} className="fill-current" />}
                  </button>
                )}

                {/* Pause / Resume recording */}
                <button 
                  type="button" 
                  onClick={isRecordingPaused ? resumeRecordingFlow : pauseRecordingFlow}
                  className={`p-2 rounded-xl transition-all ${isRecordingPaused ? 'text-amber-500 hover:bg-amber-500/10' : 'text-slate-400 hover:text-slate-600 hover:bg-black/5 dark:hover:bg-white/5'}`}
                  title={isRecordingPaused ? "Resume Recording" : "Pause Recording"}
                >
                  {isRecordingPaused ? <Mic size={16} /> : <Pause size={16} />}
                </button>

                {/* Send voice note */}
                <button 
                  type="button"
                  onClick={() => stopRecordingFlow(true)}
                  className="p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
                  title="Send Voice Note"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          ) : (
            <form 
              onSubmit={handleSend} 
              className="flex items-center gap-2 bg-slate-50 dark:bg-white/5 rounded-2xl p-1.5 shadow-inner border border-black/5 dark:border-white/10 focus-within:border-blue-500/50 transition-all w-full overflow-hidden"
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileChange}
                accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
              />
              <div className="flex items-center flex-shrink-0">
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || !isConnected}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:bg-black/10 dark:hover:bg-white/5 transition-colors disabled:opacity-30"
                  title="Attach file"
                >
                  {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} />}
                </button>
                <button 
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  disabled={!isConnected}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors disabled:opacity-30 ${showEmojiPicker ? 'bg-blue-500/10 text-blue-500' : 'text-slate-400 hover:bg-black/10 dark:hover:bg-white/5'}`}
                  title="Emoji"
                >
                  <Smile size={18} />
                </button>
                <button 
                  type="button"
                  onClick={startRecordingFlow}
                  disabled={!isConnected}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:bg-black/10 dark:hover:bg-white/5 transition-colors disabled:opacity-30"
                  title="Record Voice Note"
                >
                  <Mic size={18} />
                </button>
              </div>
              
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onPaste={handlePaste}
                placeholder="Write a message..."
                className="flex-1 bg-transparent border-none outline-none text-sm px-1 py-1.5 min-w-0"
                style={{ color: 'var(--text-primary)' }}
              />
              <button 
                type="submit" 
                disabled={!inputValue.trim() || !isConnected}
                className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 disabled:opacity-30 disabled:grayscale hover:scale-105 active:scale-95 transition-all shadow-lg shadow-blue-600/20"
              >
                <Send size={16} />
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
