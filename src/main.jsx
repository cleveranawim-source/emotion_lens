import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  Camera,
  Check,
  ClipboardList,
  Download,
  Eraser,
  Eye,
  Info,
  Pause,
  Play,
  RefreshCcw,
  Shield,
  Trash2,
  Upload,
  UserPlus,
  VideoOff,
  X,
} from 'lucide-react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import './styles.css';

const STORAGE_KEY = 'emotion-camera-checkin.records.v1';
const ASSET_BASE = import.meta.env.BASE_URL;
const MODEL_URL = `${ASSET_BASE}models/face_landmarker.task`;
const WASM_URL = `${ASSET_BASE}mediapipe`;

const emotionOptions = [
  { id: 'happiness', label: '행복', color: '#facc15', tone: 'positive' },
  { id: 'joy', label: '기쁨', color: '#eab308', tone: 'positive' },
  { id: 'gratitude', label: '감사', color: '#10b981', tone: 'positive' },
  { id: 'hope', label: '희망', color: '#14b8a6', tone: 'positive' },
  { id: 'excitement', label: '신남', color: '#f472b6', tone: 'positive' },
  { id: 'love', label: '사랑', color: '#ec4899', tone: 'positive' },
  { id: 'pleasure', label: '즐거움', color: '#f9a8d4', tone: 'positive' },
  { id: 'satisfaction', label: '만족', color: '#22c55e', tone: 'positive' },
  { id: 'wish', label: '소망', color: '#34d399', tone: 'positive' },
  { id: 'cozy', label: '포근', color: '#4ade80', tone: 'positive' },
  { id: 'admiration', label: '감탄', color: '#fb7185', tone: 'positive' },
  { id: 'passion', label: '열정', color: '#f472b6', tone: 'positive' },
  { id: 'generosity', label: '너그러움', color: '#2dd4bf', tone: 'positive' },
  { id: 'relief', label: '안심', color: '#2dd4bf', tone: 'calm' },
  { id: 'calm', label: '차분', color: '#86efac', tone: 'calm' },
  { id: 'solitude', label: '고독', color: '#bbf7d0', tone: 'low' },
  { id: 'sympathy', label: '측은', color: '#2dd4bf', tone: 'low' },
  { id: 'pride', label: '자랑', color: '#f9a8d4', tone: 'positive' },
  { id: 'surprise', label: '놀람', color: '#fb923c', tone: 'high' },
  { id: 'jealousy', label: '질투', color: '#fdba74', tone: 'negative' },
  { id: 'ordinary', label: '보통', color: '#9ca3af', tone: 'neutral' },
  { id: 'timid', label: '소심', color: '#7dd3fc', tone: 'low' },
  { id: 'longing', label: '그리움', color: '#60a5fa', tone: 'low' },
  { id: 'embarrassment', label: '부끄러움', color: '#38bdf8', tone: 'low' },
  { id: 'nervous', label: '긴장', color: '#60a5fa', tone: 'tense' },
  { id: 'remorse', label: '뉘우침', color: '#60a5fa', tone: 'low' },
  { id: 'confusing', label: '난해', color: '#60a5fa', tone: 'tense' },
  { id: 'tired', label: '피곤', color: '#60a5fa', tone: 'low' },
  { id: 'worry', label: '걱정', color: '#6366f1', tone: 'tense' },
  { id: 'bored', label: '따분', color: '#6366f1', tone: 'low' },
  { id: 'regret', label: '후회', color: '#6366f1', tone: 'low' },
  { id: 'flustered', label: '당황', color: '#fb923c', tone: 'high' },
  { id: 'desire', label: '바람', color: '#fb923c', tone: 'positive' },
  { id: 'irritation', label: '짜증', color: '#fb6b3b', tone: 'negative' },
  { id: 'sadness', label: '슬픔', color: '#a78bfa', tone: 'negative' },
  { id: 'disappointment', label: '실망', color: '#a78bfa', tone: 'negative' },
  { id: 'disgust', label: '역겨움', color: '#a855f7', tone: 'negative' },
  { id: 'giving-up', label: '포기', color: '#a855f7', tone: 'negative' },
  { id: 'hate', label: '미움', color: '#ef4444', tone: 'negative' },
  { id: 'antipathy', label: '반감', color: '#ef4444', tone: 'negative' },
  { id: 'anger', label: '화', color: '#f43f5e', tone: 'negative' },
  { id: 'anxiety', label: '불안', color: '#71717a', tone: 'tense' },
  { id: 'frustration', label: '좌절', color: '#818cf8', tone: 'negative' },
  { id: 'fear', label: '두려움', color: '#818cf8', tone: 'tense' },
  { id: 'loneliness', label: '외로움', color: '#818cf8', tone: 'low' },
  { id: 'depression', label: '우울', color: '#d1d5db', tone: 'negative' },
];

const autoAnalysisEmotionIds = new Set([
  'happiness',
  'joy',
  'excitement',
  'pleasure',
  'satisfaction',
  'surprise',
  'flustered',
  'nervous',
  'worry',
  'tired',
  'sadness',
  'disappointment',
  'anger',
  'irritation',
  'anxiety',
  'fear',
  'embarrassment',
  'ordinary',
]);

const emotionGroups = [
  {
    id: 'bright',
    label: '밝은 감정',
    color: '#facc15',
    emotionIds: ['happiness', 'joy', 'excitement', 'pleasure', 'satisfaction', 'gratitude', 'hope', 'love', 'relief'],
    reason: '웃음, 볼 주변 움직임, 부드러운 표정 단서가 보여요.',
  },
  {
    id: 'surprised',
    label: '놀람·당황',
    color: '#fb923c',
    emotionIds: ['surprise', 'flustered', 'admiration'],
    reason: '눈이나 입이 크게 열리는 변화가 보여요.',
  },
  {
    id: 'tense',
    label: '긴장된 감정',
    color: '#6366f1',
    emotionIds: ['nervous', 'worry', 'anxiety', 'fear', 'embarrassment'],
    reason: '눈썹, 눈, 입 주변에 긴장과 관련된 단서가 보여요.',
  },
  {
    id: 'low',
    label: '낮은 에너지',
    color: '#60a5fa',
    emotionIds: ['tired', 'sadness', 'disappointment', 'loneliness', 'depression', 'bored'],
    reason: '표정 에너지가 낮거나 눈 주변 움직임이 무거워 보여요.',
  },
  {
    id: 'uncomfortable',
    label: '불편한 감정',
    color: '#ef4444',
    emotionIds: ['anger', 'irritation', 'frustration', 'disgust', 'hate', 'antipathy'],
    reason: '눈썹, 코, 입술 주변에 불편감과 관련된 단서가 보여요.',
  },
  {
    id: 'neutral',
    label: '보통',
    color: '#9ca3af',
    emotionIds: ['ordinary', 'calm'],
    reason: '큰 표정 변화가 적어 현재는 중립적인 상태에 가까워 보여요.',
  },
];

const emotionById = new Map(emotionOptions.map((emotion) => [emotion.id, emotion]));

// 감정 흐름 요약용: 세부 감정의 tone을 큰 결(무드)로 묶는다.
const moodFamilies = [
  { key: 'bright', label: '밝음', color: '#f59e0b', tones: ['positive', 'high'] },
  { key: 'calm', label: '차분', color: '#10b981', tones: ['calm'] },
  { key: 'low', label: '가라앉음', color: '#60a5fa', tones: ['low'] },
  { key: 'hard', label: '긴장·힘듦', color: '#8b5cf6', tones: ['tense', 'negative'] },
  { key: 'neutral', label: '보통', color: '#9ca3af', tones: ['neutral'] },
];

function moodFamilyOf(tone) {
  return moodFamilies.find((family) => family.tones.includes(tone)) || moodFamilies[moodFamilies.length - 1];
}

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function scoreOf(categories, name) {
  return categories.find((item) => item.categoryName === name)?.score ?? 0;
}

function summarizeBlendshapes(categories = []) {
  const smile = Math.max(scoreOf(categories, 'mouthSmileLeft'), scoreOf(categories, 'mouthSmileRight'));
  const frown = Math.max(scoreOf(categories, 'mouthFrownLeft'), scoreOf(categories, 'mouthFrownRight'));
  const jawOpen = scoreOf(categories, 'jawOpen');
  const eyesWide = Math.max(scoreOf(categories, 'eyeWideLeft'), scoreOf(categories, 'eyeWideRight'));
  const blink = Math.max(scoreOf(categories, 'eyeBlinkLeft'), scoreOf(categories, 'eyeBlinkRight'));
  const browDown = Math.max(scoreOf(categories, 'browDownLeft'), scoreOf(categories, 'browDownRight'));
  const browInnerUp = scoreOf(categories, 'browInnerUp');
  const mouthPress = Math.max(scoreOf(categories, 'mouthPressLeft'), scoreOf(categories, 'mouthPressRight'));
  const mouthPucker = scoreOf(categories, 'mouthPucker');
  const cheekSquint = Math.max(scoreOf(categories, 'cheekSquintLeft'), scoreOf(categories, 'cheekSquintRight'));
  const noseSneer = Math.max(scoreOf(categories, 'noseSneerLeft'), scoreOf(categories, 'noseSneerRight'));
  const eyeSquint = Math.max(scoreOf(categories, 'eyeSquintLeft'), scoreOf(categories, 'eyeSquintRight'));

  const positive = clamp(smile * 1.08 + cheekSquint * 0.45 - browDown * 0.22 - frown * 0.35);
  const highEnergy = clamp(jawOpen * 0.45 + eyesWide * 0.42 + smile * 0.35);
  const surprise = clamp(jawOpen * 0.75 + eyesWide * 0.58 + browInnerUp * 0.25);
  const tension = clamp(browDown * 0.52 + mouthPress * 0.42 + blink * 0.24 + eyeSquint * 0.22);
  const sadness = clamp(browInnerUp * 0.48 + frown * 0.55 + mouthPress * 0.2 + (0.2 - smile) * 0.45);
  const anger = clamp(browDown * 0.68 + noseSneer * 0.38 + mouthPress * 0.34 + eyeSquint * 0.26);
  const disgust = clamp(noseSneer * 0.72 + mouthPucker * 0.34 + browDown * 0.28);
  const lowEnergy = clamp(blink * 0.36 + (0.28 - smile) * 0.55 + mouthPress * 0.18);
  const calmScore = clamp(0.5 - Math.max(jawOpen, eyesWide, browDown, frown, mouthPress, noseSneer) * 0.48);
  const shy = clamp(smile * 0.32 + blink * 0.28 + browInnerUp * 0.22 + mouthPress * 0.18);

  const reasonByTone = {
    positive: '입꼬리와 볼 주변의 밝은 표정 단서가 보여요.',
    calm: '큰 표정 변화가 적어 안정적인 상태에 가까워 보여요.',
    neutral: '뚜렷하게 강한 표정 변화가 크지 않아요.',
    high: '눈, 입, 얼굴 근육의 변화가 비교적 크게 보여요.',
    tense: '눈썹과 입 주변에 힘이 들어간 단서가 보여요.',
    low: '표정 에너지가 낮거나 눈 주변 움직임이 차분하게 보여요.',
    negative: '눈썹, 입술, 코 주변에 불편감과 관련된 단서가 보여요.',
  };

  const formulas = {
    happiness: positive * 0.9 + calmScore * 0.12,
    joy: positive * 0.78 + highEnergy * 0.18,
    gratitude: positive * 0.62 + calmScore * 0.24,
    hope: positive * 0.45 + eyesWide * 0.25 + calmScore * 0.2,
    excitement: positive * 0.62 + highEnergy * 0.42,
    love: positive * 0.58 + calmScore * 0.22 + shy * 0.12,
    pleasure: positive * 0.74 + highEnergy * 0.16,
    satisfaction: positive * 0.52 + calmScore * 0.38,
    wish: positive * 0.3 + browInnerUp * 0.3 + calmScore * 0.2,
    cozy: calmScore * 0.52 + positive * 0.28,
    admiration: surprise * 0.5 + positive * 0.42,
    passion: positive * 0.35 + highEnergy * 0.48,
    generosity: calmScore * 0.42 + positive * 0.34,
    relief: calmScore * 0.55 + positive * 0.18,
    calm: calmScore * 0.32 + positive * 0.08,
    solitude: lowEnergy * 0.42 + calmScore * 0.2,
    sympathy: sadness * 0.32 + browInnerUp * 0.28 + calmScore * 0.14,
    pride: positive * 0.42 + mouthPress * 0.15 + calmScore * 0.18,
    surprise,
    jealousy: anger * 0.24 + sadness * 0.24 + mouthPress * 0.2,
    ordinary: calmScore * 0.62 + (0.24 - Math.max(positive, tension, sadness, surprise)) * 0.5,
    timid: shy * 0.5 + tension * 0.22,
    longing: sadness * 0.34 + browInnerUp * 0.28 + lowEnergy * 0.24,
    embarrassment: shy * 0.58 + positive * 0.12,
    nervous: tension * 0.72 + eyesWide * 0.18,
    remorse: sadness * 0.36 + mouthPress * 0.25 + browInnerUp * 0.18,
    confusing: tension * 0.38 + eyeSquint * 0.3 + browInnerUp * 0.16,
    tired: lowEnergy * 0.62 + blink * 0.24,
    worry: tension * 0.48 + browInnerUp * 0.3,
    bored: lowEnergy * 0.5 + calmScore * 0.18 - positive * 0.1,
    regret: sadness * 0.4 + mouthPress * 0.25,
    flustered: surprise * 0.42 + tension * 0.36,
    desire: positive * 0.24 + browInnerUp * 0.24 + mouthPucker * 0.2,
    irritation: anger * 0.48 + tension * 0.28,
    sadness: sadness * 0.78,
    disappointment: sadness * 0.52 + mouthPress * 0.24,
    disgust,
    'giving-up': sadness * 0.38 + lowEnergy * 0.34,
    hate: anger * 0.42 + disgust * 0.32,
    antipathy: anger * 0.32 + disgust * 0.32 + mouthPress * 0.16,
    anger: anger * 0.78,
    anxiety: tension * 0.58 + eyesWide * 0.22 + browInnerUp * 0.16,
    frustration: sadness * 0.38 + anger * 0.28 + mouthPress * 0.22,
    fear: tension * 0.42 + eyesWide * 0.36 + browInnerUp * 0.24,
    loneliness: sadness * 0.42 + lowEnergy * 0.28 + calmScore * 0.1,
    depression: sadness * 0.44 + lowEnergy * 0.36,
  };

  const scoresById = new Map(
    emotionOptions.map((emotion) => [emotion.id, clamp(formulas[emotion.id] ?? 0)]),
  );

  const autoCandidates = emotionOptions
    .filter((emotion) => autoAnalysisEmotionIds.has(emotion.id))
    .map((emotion) => ({
      ...emotion,
      score: scoresById.get(emotion.id) ?? 0,
      reason: reasonByTone[emotion.tone] || reasonByTone.neutral,
    }))
    .sort((a, b) => b.score - a.score);

  const groupRanking = emotionGroups
    .map((group) => {
      const groupScores = group.emotionIds.map((id) => scoresById.get(id) ?? 0);
      const maxScore = Math.max(...groupScores);
      const averageTopTwo =
        groupScores
          .slice()
          .sort((a, b) => b - a)
          .slice(0, 2)
          .reduce((sum, value) => sum + value, 0) / Math.min(2, groupScores.length);

      return {
        ...group,
        score: clamp(maxScore * 0.68 + averageTopTwo * 0.32),
      };
    })
    .sort((a, b) => b.score - a.score);

  const group = groupRanking[0];
  const raw = emotionOptions
    .filter((emotion) => group?.emotionIds.includes(emotion.id))
    .map((emotion) => ({
      ...emotion,
      score: scoresById.get(emotion.id) ?? 0,
      reason: reasonByTone[emotion.tone] || reasonByTone.neutral,
    }))
    .sort((a, b) => b.score - a.score);

  const top = raw[0] || autoCandidates[0];
  const confidence = group ? Math.round(clamp(group.score, 0.12, 0.92) * 100) : 0;
  const second = raw[1];

  return {
    top,
    second,
    group,
    groupRanking,
    confidence,
    signals: { smile, frown, jawOpen, eyesWide, blink, browDown, browInnerUp, mouthPress },
    ranking: raw,
  };
}

function formatTime(value) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

// 표정 단서의 '뚜렷함'을 정성적으로 표현한다.
// 숫자 %는 정답처럼 보이기 쉬우므로 보조 정보로만 남기고, 표현은 '힌트'의 강도로 순화한다.
function confidenceBand(confidence) {
  if (confidence >= 67) return { short: '뚜렷', sentence: '표정 단서가 비교적 뚜렷하게 보여요.' };
  if (confidence >= 34) return { short: '중간', sentence: '표정 단서가 어느 정도 보여요.' };
  return { short: '약함', sentence: '표정 단서가 약하게 보여요.' };
}

function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function getCameraErrorMessage(error) {
  const name = error?.name || '';

  if (!window.isSecureContext) {
    return '브라우저 보안 설정 때문에 카메라를 열 수 없습니다. http://127.0.0.1:5174/ 또는 http://localhost:5174/로 열어주세요.';
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    return '이 브라우저에서는 카메라 기능을 지원하지 않습니다. Chrome이나 Edge에서 다시 열어주세요.';
  }

  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return '카메라 권한이 차단되어 있습니다. 주소창 왼쪽의 카메라 권한을 허용한 뒤 다시 눌러주세요.';
  }

  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return '사용할 수 있는 카메라를 찾지 못했습니다. 카메라 연결 상태를 확인해주세요.';
  }

  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return '다른 앱이 카메라를 사용 중일 수 있습니다. Zoom, Meet, Photo Booth 등을 끄고 다시 시도해주세요.';
  }

  return `카메라를 열 수 없습니다. ${error?.message || '브라우저 권한과 카메라 연결을 확인해주세요.'}`;
}

function drawRoundedRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function drawMirroredCoverVideo(context, video, x, y, width, height) {
  const videoRatio = video.videoWidth / video.videoHeight;
  const boxRatio = width / height;
  let sourceWidth = video.videoWidth;
  let sourceHeight = video.videoHeight;
  let sourceX = 0;
  let sourceY = 0;

  if (videoRatio > boxRatio) {
    sourceWidth = video.videoHeight * boxRatio;
    sourceX = (video.videoWidth - sourceWidth) / 2;
  } else {
    sourceHeight = video.videoWidth / boxRatio;
    sourceY = (video.videoHeight - sourceHeight) / 2;
  }

  context.save();
  drawRoundedRect(context, x, y, width, height, 14);
  context.clip();
  context.translate(x + width, y);
  context.scale(-1, 1);
  context.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);
  context.restore();
}

function drawProgressRing(context, x, y, radius, percent, color) {
  const start = -Math.PI / 2;
  const end = start + Math.PI * 2 * clamp(percent / 100);

  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.strokeStyle = '#e2ebf2';
  context.lineWidth = 14;
  context.stroke();

  context.beginPath();
  context.arc(x, y, radius, start, end);
  context.strokeStyle = color;
  context.lineWidth = 14;
  context.lineCap = 'round';
  context.stroke();

  context.fillStyle = '#111827';
  context.font = '900 26px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(`${percent}%`, x, y);
  context.textAlign = 'start';
  context.textBaseline = 'alphabetic';
}

function drawPill(context, x, y, width, height, text, color, active = false) {
  drawRoundedRect(context, x, y, width, height, 10);
  context.fillStyle = active ? '#ffffff' : '#f8fbff';
  context.fill();
  context.strokeStyle = active ? color : '#cfdae5';
  context.lineWidth = active ? 4 : 2;
  context.stroke();

  context.fillStyle = '#172033';
  context.font = '800 22px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, x + width / 2, y + height / 2 + 1);
  context.textAlign = 'start';
  context.textBaseline = 'alphabetic';
}

function drawBarRow(context, label, score, x, y, width, color) {
  const labelWidth = 142;
  const barX = x + labelWidth;
  const barWidth = width - labelWidth;
  const percentWidth = Math.max(8, barWidth * clamp(score));

  context.fillStyle = '#33475f';
  context.font = '800 22px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  context.fillText(label, x, y + 18);

  drawRoundedRect(context, barX, y + 5, barWidth, 16, 8);
  context.fillStyle = '#e4edf4';
  context.fill();

  drawRoundedRect(context, barX, y + 5, percentWidth, 16, 8);
  context.fillStyle = color;
  context.fill();
}

function createEmotionCardImage(video, record, includeFace) {
  if (includeFace && (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight)) {
    return '';
  }

  const captureCanvas = document.createElement('canvas');
  captureCanvas.width = 720;
  captureCanvas.height = 720;

  const context = captureCanvas.getContext('2d');
  context.fillStyle = '#f8fbff';
  context.fillRect(0, 0, captureCanvas.width, captureCanvas.height);

  context.strokeStyle = '#d8e3ed';
  context.lineWidth = 2;
  context.strokeRect(1, 1, captureCanvas.width - 2, captureCanvas.height - 2);

  if (includeFace) {
    drawMirroredCoverVideo(context, video, 16, 22, 208, 156);
  } else {
    drawRoundedRect(context, 16, 22, 208, 156, 14);
    context.fillStyle = '#e8f0f6';
    context.fill();
    context.strokeStyle = '#cfdae5';
    context.lineWidth = 2;
    context.stroke();

    context.fillStyle = '#536b82';
    context.font = '800 24px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('사진 제외', 120, 100);
    context.font = '600 18px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    context.fillText('감정 기록만 저장', 120, 132);
    context.textAlign = 'start';
    context.textBaseline = 'alphabetic';
  }

  context.fillStyle = '#536b82';
  context.font = '700 29px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  context.fillText(formatTime(record.createdAt), 254, 58);

  context.fillStyle = '#111827';
  context.font = '900 38px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  context.fillText(record.selectedEmotion, 254, 112);

  context.fillStyle = '#33475f';
  context.font = '700 27px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  const estimate = record.confidence
    ? `앱 추정: ${record.predictedEmotion} (${record.confidence}%)`
    : `앱 추정: ${record.predictedEmotion}`;
  context.fillText(estimate, 254, 164);

  if (record.note) {
    context.fillStyle = '#64748b';
    context.font = '600 22px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const clippedNote = record.note.length > 22 ? `${record.note.slice(0, 22)}...` : record.note;
    context.fillText(clippedNote, 254, 210);
  }

  if (record.analysis) {
    const analysis = record.analysis;
    const accent = analysis.groupColor || '#155e75';

    context.strokeStyle = '#d8e3ed';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(0, 260);
    context.lineTo(720, 260);
    context.stroke();

    context.fillStyle = '#172033';
    context.font = '900 22px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    context.fillText('현재 후보', 24, 302);

    drawProgressRing(context, 82, 376, 52, analysis.confidence || 0, accent);

    context.fillStyle = accent;
    context.font = '900 38px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    context.fillText(analysis.groupLabel || '분석 없음', 164, 356);

    context.fillStyle = '#536b82';
    context.font = '700 23px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const reason = analysis.reason || '표정 단서를 바탕으로 추정한 후보입니다.';
    const firstReason = reason.length > 28 ? `${reason.slice(0, 28)}` : reason;
    const secondReason = reason.length > 28 ? reason.slice(28, 54) : '';
    context.fillText(firstReason, 164, 398);
    if (secondReason) {
      context.fillText(secondReason, 164, 430);
    }

    const chips = (analysis.detailCandidates || []).slice(0, 4);
    chips.forEach((candidate, index) => {
      drawPill(context, 24 + index * 168, 456, 148, 52, candidate.label, candidate.color || accent, candidate.id === record.selectedEmotionId);
    });

    (analysis.groupRanking || []).slice(0, 6).forEach((item, index) => {
      drawBarRow(context, item.label, item.score, 24, 534 + index * 30, 672, accent);
    });
  }

  return captureCanvas.toDataURL('image/jpeg', 0.86);
}

function dataUrlToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mime });
}

function downloadCapturedImage(dataUrl, record) {
  if (!dataUrl) return false;

  const fileDate = new Date(record.createdAt).toISOString().replaceAll(':', '-').slice(0, 19);
  const filename = `emotion-checkin-${fileDate}-${record.selectedEmotion}.jpg`;
  const blob = dataUrlToBlob(dataUrl);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return true;
}

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const landmarkerRef = useRef(null);
  const rafRef = useRef(0);
  const streamRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);
  const lastDetectRef = useRef(0);
  const importInputRef = useRef(null);

  const [status, setStatus] = useState('ready');
  const [message, setMessage] = useState('카메라를 켜면 표정 단서를 분석합니다.');
  const [prediction, setPrediction] = useState(null);
  const [manualEmotion, setManualEmotion] = useState('ordinary');
  const [emotionEditedByUser, setEmotionEditedByUser] = useState(false);
  const [note, setNote] = useState('');
  const [records, setRecords] = useState(loadRecords);
  const [cameraOn, setCameraOn] = useState(false);
  const [previewRecord, setPreviewRecord] = useState(null);
  const [emotionPickerOpen, setEmotionPickerOpen] = useState(false);
  const [showAllEmotions, setShowAllEmotions] = useState(false);
  const [includeFaceCapture, setIncludeFaceCapture] = useState(true);
  const [candidateRevealed, setCandidateRevealed] = useState(false);

  const todayRecords = useMemo(() => {
    const today = new Date().toDateString();
    return records.filter((record) => new Date(record.createdAt).toDateString() === today);
  }, [records]);

  // 감정 흐름: 기록을 시간순(왼→오)으로 나열한 점 + 큰 결(무드) 분포.
  const flow = useMemo(() => {
    const points = records
      .slice()
      .reverse()
      .map((record) => ({
        id: record.id,
        label: record.selectedEmotion,
        time: formatTime(record.createdAt),
        color: emotionById.get(record.selectedEmotionId)?.color || '#9ca3af',
      }));

    const tally = new Map();
    records.forEach((record) => {
      const tone = emotionById.get(record.selectedEmotionId)?.tone || 'neutral';
      const family = moodFamilyOf(tone);
      tally.set(family.key, (tally.get(family.key) || 0) + 1);
    });

    const families = moodFamilies
      .map((family) => ({ ...family, count: tally.get(family.key) || 0 }))
      .filter((family) => family.count > 0)
      .sort((a, b) => b.count - a.count);

    return { points, families, total: records.length };
  }, [records]);

  const saveRecords = useCallback((nextRecords) => {
    setRecords(nextRecords);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRecords));
    } catch {
      setMessage('저장 공간이 부족해요. 내보내기로 백업한 뒤 오래된 기록을 정리해주세요.');
    }
  }, []);

  const drawOverlay = useCallback((result) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const context = canvas.getContext('2d');
    const rect = video.getBoundingClientRect();
    canvas.width = Math.round(rect.width);
    canvas.height = Math.round(rect.height);
    context.clearRect(0, 0, canvas.width, canvas.height);

    const face = result?.faceLandmarks?.[0];
    if (!face) return;

    const xs = face.map((point) => point.x * canvas.width);
    const ys = face.map((point) => point.y * canvas.height);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const padding = 16;

    context.strokeStyle = '#22c55e';
    context.lineWidth = 3;
    context.setLineDash([10, 8]);
    context.strokeRect(
      minX - padding,
      minY - padding,
      maxX - minX + padding * 2,
      maxY - minY + padding * 2,
    );
    context.setLineDash([]);
  }, []);

  const runDetection = useCallback(() => {
    const landmarker = landmarkerRef.current;
    const video = videoRef.current;

    if (!landmarker || !video || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(runDetection);
      return;
    }

    // 감정 체크인은 고프레임이 필요 없다. 새 프레임이면서 최소 간격(~11fps)이 지났을 때만 감지해 부하를 줄인다.
    const now = performance.now();
    if (lastVideoTimeRef.current !== video.currentTime && now - lastDetectRef.current >= 90) {
      lastVideoTimeRef.current = video.currentTime;
      lastDetectRef.current = now;
      const result = landmarker.detectForVideo(video, now);
      drawOverlay(result);

      if (result.faceBlendshapes?.[0]?.categories?.length) {
        const summary = summarizeBlendshapes(result.faceBlendshapes[0].categories);
        setPrediction(summary);
        // 앵커링 방지: 앱 추정으로 사용자의 선택을 자동으로 바꾸지 않는다. 감정은 학생이 직접 고른다.
        setMessage('표정 단서를 읽고 있어요. 감정은 스스로 골라주세요.');
      } else {
        setPrediction(null);
        setMessage('얼굴이 화면 중앙에 오도록 조금만 맞춰주세요.');
      }
    }

    rafRef.current = requestAnimationFrame(runDetection);
  }, [drawOverlay]);

  const startCamera = useCallback(async () => {
    try {
      setStatus('loading');
      setMessage('카메라를 먼저 여는 중입니다.');

      // 재시작('다시 분석') 시 이전 감지 루프와 카메라 트랙을 정리해 중복 실행·트랙 누수를 막는다.
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());

      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('camera-api-unavailable');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setCameraOn(true);
      setMessage('카메라는 켜졌고, 표정 분석 모델을 준비하는 중입니다.');

      if (!landmarkerRef.current) {
        const vision = await FilesetResolver.forVisionTasks(WASM_URL);
        const modelOptions = {
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: true,
        };

        try {
          landmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
            ...modelOptions,
            baseOptions: {
              modelAssetPath: MODEL_URL,
              delegate: 'GPU',
            },
          });
        } catch {
          landmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
            ...modelOptions,
            baseOptions: {
              modelAssetPath: MODEL_URL,
              delegate: 'CPU',
            },
          });
        }
      }
      setStatus('running');
      rafRef.current = requestAnimationFrame(runDetection);
    } catch (error) {
      if (streamRef.current) {
        setCameraOn(true);
        setStatus('error');
        setMessage(`카메라는 켜졌지만 분석 모델을 불러오지 못했습니다. ${error?.message || ''}`.trim());
        return;
      }

      setStatus('error');
      setCameraOn(false);
      setMessage(getCameraErrorMessage(error));
    }
  }, [runDetection]);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    const canvas = canvasRef.current;
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    setCameraOn(false);
    setStatus('ready');
    setMessage('카메라가 꺼졌습니다.');
  }, []);

  const addRecord = () => {
    const selected = emotionOptions.find((item) => item.id === manualEmotion);
    const analysis = prediction
      ? {
          groupLabel: prediction.group?.label || '분석 없음',
          groupColor: prediction.group?.color || '#155e75',
          confidence: prediction.confidence || 0,
          reason: prediction.group?.reason || '',
          detailCandidates: (prediction.ranking || []).slice(0, 4).map((item) => ({
            id: item.id,
            label: item.label,
            color: item.color,
            score: item.score,
          })),
          groupRanking: (prediction.groupRanking || []).slice(0, 6).map((item) => ({
            id: item.id,
            label: item.label,
            score: item.score,
          })),
        }
      : null;
    const record = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      selectedEmotionId: selected?.id || 'ordinary',
      selectedEmotion: selected?.label || '보통',
      predictedEmotion: prediction?.group
        ? `${prediction.group.label}: ${prediction.top?.label || '세부 후보 없음'}`
        : '분석 없음',
      confidence: prediction?.confidence || 0,
      note: note.trim(),
      analysis,
      includesFaceCapture: includeFaceCapture,
      capturedImage: '',
    };
    record.capturedImage = createEmotionCardImage(videoRef.current, record, includeFaceCapture);
    saveRecords([record, ...records].slice(0, 24));
    setNote('');
    setEmotionEditedByUser(false);
    setManualEmotion('ordinary');
    setCandidateRevealed(false);
    setMessage('기록을 저장했습니다. 이미지는 감정 기록에서 눌러 크게 볼 수 있어요.');
  };

  const deleteRecord = (id) => {
    saveRecords(records.filter((record) => record.id !== id));
  };

  const clearAllRecords = () => {
    if (!records.length) return;
    if (!window.confirm('이 기기에 저장된 감정 기록을 모두 지울까요? 되돌릴 수 없어요.')) return;
    saveRecords([]);
    setPreviewRecord(null);
    setMessage('저장된 기록을 모두 지웠습니다.');
  };

  // 공용 기기 대응: 다음 사람에게 넘기기 전에 카메라를 끄고 기록과 진행 상태를 깨끗이 비운다.
  const handoffNextPerson = () => {
    if (records.length && !window.confirm('다음 사람에게 넘길게요.\n이 기기의 기록을 모두 지우고 처음 화면으로 돌아갑니다. 계속할까요?')) {
      return;
    }
    stopCamera();
    saveRecords([]);
    setPrediction(null);
    setNote('');
    setManualEmotion('ordinary');
    setEmotionEditedByUser(false);
    setCandidateRevealed(false);
    setEmotionPickerOpen(false);
    setShowAllEmotions(false);
    setPreviewRecord(null);
    setMessage('처음 화면으로 돌아왔어요. 다음 사람이 카메라를 켜면 됩니다.');
  };

  const exportRecords = () => {
    const csv = [
      ['날짜', '사용자 확인 감정', '앱 추정', '확신도', '얼굴 캡처', '메모'],
      ...records.map((record) => [
        formatTime(record.createdAt),
        record.selectedEmotion,
        record.predictedEmotion,
        `${record.confidence}%`,
        record.includesFaceCapture === false ? '제외' : '포함',
        record.note.replaceAll('"', '""'),
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'emotion-checkin-records.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  // JSON \uBC31\uC5C5/\uC774\uC804: 24\uAC1C cap\uC73C\uB85C \uC0AC\uB77C\uC9C8 \uAE30\uB85D\uC744 \uBCF4\uC874\uD558\uACE0, \uB2E4\uB978 \uAE30\uAE30\u00B7\uC571(Lev Diary)\uC73C\uB85C \uB118\uAE38 \uC218 \uC788\uB294 \uC774\uC2DD\uC6A9 \uD3EC\uB9F7.
  // \uC5BC\uAD74 \uC774\uBBF8\uC9C0\uB294 \uC6A9\uB7C9\u00B7\uAC1C\uC778\uC815\uBCF4 \uBCF4\uD638\uB97C \uC704\uD574 \uC81C\uC678\uD558\uACE0 \uAC10\uC815 \uB370\uC774\uD130\uB9CC \uB2F4\uB294\uB2E4.
  const exportJson = () => {
    if (!records.length) return;
    const payload = {
      app: 'emotion-lens',
      schema: 'emotion-checkin/v1',
      exportedAt: new Date().toISOString(),
      count: records.length,
      records: records.map(({ capturedImage, ...rest }) => rest),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `emotion-lens-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text());
      const incoming = Array.isArray(parsed) ? parsed : parsed?.records;
      if (!Array.isArray(incoming)) throw new Error('\uAC10\uC815 \uAE30\uB85D \uD615\uC2DD\uC774 \uC544\uB2C8\uC5D0\uC694.');

      const normalized = incoming
        .filter((item) => item && item.createdAt && item.selectedEmotion)
        .map((item) => ({
          id: typeof item.id === 'string' ? item.id : crypto.randomUUID(),
          createdAt: item.createdAt,
          selectedEmotionId: item.selectedEmotionId || 'ordinary',
          selectedEmotion: item.selectedEmotion || '\uBCF4\uD1B5',
          predictedEmotion: item.predictedEmotion || '\uBD84\uC11D \uC5C6\uC74C',
          confidence: Number(item.confidence) || 0,
          note: typeof item.note === 'string' ? item.note : '',
          analysis: item.analysis || null,
          includesFaceCapture: item.includesFaceCapture === true,
          capturedImage: typeof item.capturedImage === 'string' ? item.capturedImage : '',
        }));

      if (!normalized.length) throw new Error('\uAC00\uC838\uC62C \uAE30\uB85D\uC774 \uC5C6\uC5B4\uC694.');

      const byId = new Map();
      [...normalized, ...records].forEach((record) => {
        if (!byId.has(record.id)) byId.set(record.id, record);
      });
      const merged = [...byId.values()]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 24);

      saveRecords(merged);
      setMessage(`${normalized.length}\uAC1C \uAE30\uB85D\uC744 \uAC00\uC838\uC654\uC5B4\uC694. \uC911\uBCF5\uC744 \uC81C\uC678\uD558\uACE0 \uCD5C\uADFC 24\uAC1C\uB97C \uC720\uC9C0\uD569\uB2C8\uB2E4.`);
    } catch (error) {
      setMessage(`\uAC00\uC838\uC624\uAE30\uC5D0 \uC2E4\uD328\uD588\uC5B4\uC694. ${error?.message || '\uD30C\uC77C\uC744 \uD655\uC778\uD574\uC8FC\uC138\uC694.'}`.trim());
    }
  };

  useEffect(() => () => stopCamera(), [stopCamera]);

  useEffect(() => {
    if (!previewRecord) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setPreviewRecord(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewRecord]);

  const topEmotion = prediction?.top;
  const topGroup = prediction?.group;
  const currentOption = topGroup || emotionOptions.find((item) => item.id === (topEmotion?.id || manualEmotion));
  const selectedEmotion = emotionOptions.find((item) => item.id === manualEmotion) || emotionOptions.find((item) => item.id === 'ordinary');
  const selectedEmotionLabel = selectedEmotion?.label || '보통';
  const recommendedEmotions = prediction?.ranking?.slice(0, 4) || [];
  // 스스로 고르기 전까지 앱 추정을 숨겨 앵커링을 막고, 고른 뒤 '비교' 맥락으로 보여준다.
  const revealCandidate = candidateRevealed || emotionEditedByUser;
  const band = confidenceBand(prediction?.confidence || 0);

  return (
    <main className="app-shell">
      <section className="workspace">
        <div className="camera-panel">
          <header className="topbar">
            <div>
              <p className="eyebrow">표정 기반 감정 체크인</p>
              <h1>마음 렌즈</h1>
            </div>
            <div className="privacy-badge" title="기록과 캡처 이미지는 서버로 보내지 않고 이 브라우저(localStorage)에만 저장됩니다.">
              <Shield size={18} />
              로컬 기록
            </div>
          </header>

          <div className="stage">
            <button className="mobile-camera-button" onClick={cameraOn ? stopCamera : startCamera}>
              {cameraOn ? <Pause size={18} /> : <Play size={18} />}
              {cameraOn ? '멈추기' : '카메라 켜기'}
            </button>
            <video ref={videoRef} playsInline muted className={cameraOn ? 'visible' : ''} />
            <canvas ref={canvasRef} />
            {!cameraOn && (
              <div className="empty-camera">
                <Camera size={42} />
                <span>카메라 준비</span>
              </div>
            )}
          </div>

          <div className="controls">
            <button className="primary-button" onClick={cameraOn ? stopCamera : startCamera}>
              {cameraOn ? <Pause size={19} /> : <Play size={19} />}
              {cameraOn ? '멈추기' : '카메라 켜기'}
            </button>
            <button className="icon-button" onClick={startCamera} disabled={status === 'loading'} title="다시 분석">
              <RefreshCcw size={19} />
            </button>
            <div className={`status ${status}`}>
              <Activity size={16} />
              {message}
            </div>
          </div>
          <div className="mobile-quick-save">
            <span>{selectedEmotionLabel}</span>
            <button className="save-button" onClick={addRecord}>
              <ClipboardList size={18} />
              기록하기
            </button>
          </div>
        </div>

        <aside className="insight-panel">
          <div className="result-card">
            <div className="section-title">
              <Eye size={18} />
              앱이 본 표정 단서
            </div>
            {!revealCandidate ? (
              <div className="candidate-cover">
                <p className="candidate-cover-title">먼저 스스로 골라볼까요?</p>
                <p className="candidate-cover-sub">
                  앱의 추정은 정답이 아니라 참고용 힌트예요. 지금 내 마음을 직접 고른 뒤, 앱이 본 표정 단서와 비교해보세요.
                </p>
                <button className="reveal-button" onClick={() => setCandidateRevealed(true)}>
                  <Eye size={17} />
                  앱이 본 단서 비교해보기
                </button>
              </div>
            ) : (
              <>
                <div className="emotion-meter" style={{ '--accent': currentOption?.color || '#3b82f6' }}>
                  <div className="meter-ring">
                    <span>{prediction ? band.short : '--'}</span>
                  </div>
                  <div>
                    <p className="result-label">{topGroup ? `혹시 '${topGroup.label}'일까요?` : '대기 중'}</p>
                    <p className="result-copy">
                      {topGroup?.reason || '카메라를 켜고 얼굴을 화면 중앙에 맞춰주세요.'}
                    </p>
                    {prediction && (
                      <p className="confidence-fine">{band.sentence} · 앱 추정 확신도 {prediction.confidence}% (참고용)</p>
                    )}
                  </div>
                </div>

                {topEmotion && (
                  <div className="detail-candidates">
                    {(prediction?.ranking || []).slice(0, 4).map((item) => (
                      <button
                        key={item.id}
                        className={manualEmotion === item.id ? 'active' : ''}
                        onClick={() => {
                          setManualEmotion(item.id);
                          setEmotionEditedByUser(true);
                        }}
                        style={{ '--emotion': item.color }}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}

                <div className="bars">
                  {(prediction?.groupRanking || []).slice(0, 6).map((item) => (
                    <div className="bar-row" key={item.id}>
                      <span>{item.label}</span>
                      <div className="bar-track">
                        <div style={{ width: `${Math.round(item.score * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="checkin-card">
            <div className="section-title">
              <Check size={18} />
              지금 내 마음, 내가 고르기
            </div>

            <div className="selected-emotion-panel" style={{ '--emotion': selectedEmotion?.color || '#9ca3af' }}>
              <div>
                <span>선택한 감정</span>
                <strong>{selectedEmotionLabel}</strong>
              </div>
              <button
                className="change-emotion-button"
                onClick={() => {
                  setEmotionPickerOpen((open) => !open);
                  setShowAllEmotions(false);
                }}
              >
                바꾸기
              </button>
            </div>

            {emotionPickerOpen && (
              <div className="emotion-picker">
                {recommendedEmotions.length > 0 && (
                  <>
                    <p>앱이 본 표정 힌트 <span className="picker-hint-tag">참고용</span></p>
                    <div className="emotion-suggestions">
                      {recommendedEmotions.map((emotion) => (
                        <button
                          key={emotion.id}
                          className={manualEmotion === emotion.id ? 'selected' : ''}
                          onClick={() => {
                            setManualEmotion(emotion.id);
                            setEmotionEditedByUser(true);
                            setEmotionPickerOpen(false);
                          }}
                          style={{ '--emotion': emotion.color }}
                        >
                          {emotion.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                <button className="show-all-button" onClick={() => setShowAllEmotions((visible) => !visible)}>
                  {showAllEmotions ? '전체 감정 접기' : '전체 감정 보기'}
                </button>

                {showAllEmotions && (
                  <div className="emotion-grid">
                    {emotionOptions.map((emotion) => (
                      <button
                        key={emotion.id}
                        className={manualEmotion === emotion.id ? 'selected' : ''}
                        onClick={() => {
                          setManualEmotion(emotion.id);
                          setEmotionEditedByUser(true);
                          setEmotionPickerOpen(false);
                          setShowAllEmotions(false);
                        }}
                        style={{ '--emotion': emotion.color }}
                      >
                        {emotion.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="지금 감정이 생긴 상황을 짧게 적어보세요."
              rows={3}
            />
            <label className="capture-toggle">
              <input
                type="checkbox"
                checked={includeFaceCapture}
                onChange={(event) => setIncludeFaceCapture(event.target.checked)}
              />
              <span className="toggle-switch" aria-hidden="true">
                <span />
              </span>
              <span className="toggle-copy">
                얼굴 캡처 {includeFaceCapture ? '포함됨' : '제외됨'}
              </span>
            </label>
            <button className="save-button" onClick={addRecord}>
              <ClipboardList size={18} />
              기록하기
            </button>
          </div>
        </aside>
      </section>

      <section className="records-panel">
        <div className="records-header">
          <div>
            <p className="eyebrow">오늘 {todayRecords.length}개 기록</p>
            <h2>감정 기록</h2>
          </div>
          <div className="records-actions">
            <button className="utility-button" onClick={handoffNextPerson} title="카메라를 끄고 이 기기의 기록을 비운 뒤 처음 화면으로">
              <UserPlus size={17} />
              다음 사람
            </button>
            <button className="utility-button" onClick={exportRecords} disabled={!records.length}>
              <Download size={17} />
              CSV
            </button>
            <button className="utility-button" onClick={exportJson} disabled={!records.length} title="감정 데이터를 JSON으로 백업 (얼굴 이미지 제외)">
              <Download size={17} />
              JSON
            </button>
            <button className="utility-button" onClick={() => importInputRef.current?.click()} title="JSON 백업 파일에서 기록 가져오기">
              <Upload size={17} />
              가져오기
            </button>
            <button className="utility-button danger" onClick={clearAllRecords} disabled={!records.length}>
              <Eraser size={17} />
              전체 지우기
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              onChange={importJson}
              hidden
            />
          </div>
        </div>

        <div className="privacy-note">
          <Info size={17} />
          기록하기를 누르면 감정 카드가 이 브라우저에만 저장됩니다. 얼굴 캡처 포함 여부는 직접 선택할 수 있어요. 여러 명이 함께 쓰는 기기라면, 사용 후 <strong>‘다음 사람’</strong> 또는 <strong>‘전체 지우기’</strong>로 내 기록을 정리해 주세요.
        </div>

        {flow.total > 1 && (
          <div className="flow-card">
            <div className="flow-head">
              <span className="flow-title">감정 흐름</span>
              <span className="flow-sub">최근 {flow.total}개 · 왼쪽이 오래된 기록</span>
            </div>
            <div className="flow-track">
              {flow.points.map((point) => (
                <span
                  key={point.id}
                  className="flow-dot"
                  style={{ '--dot': point.color }}
                  title={`${point.time} · ${point.label}`}
                />
              ))}
            </div>
            <div className="flow-families">
              {flow.families.map((family) => (
                <div className="flow-family" key={family.key}>
                  <span className="flow-family-swatch" style={{ background: family.color }} />
                  <span className="flow-family-label">{family.label}</span>
                  <span className="flow-family-count">{family.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="records-list">
          {records.length ? (
            records.map((record) => (
              <article className="record-item" key={record.id}>
                {record.capturedImage ? (
                  <button
                    className="record-photo-button"
                    onClick={() => setPreviewRecord(record)}
                    title="캡처 이미지 크게 보기"
                  >
                    <img className="record-photo" src={record.capturedImage} alt={`${record.selectedEmotion} 기록 얼굴 캡처`} />
                  </button>
                ) : (
                  <div className="record-photo placeholder">
                    <Camera size={22} />
                  </div>
                )}
                <div>
                  <time>{formatTime(record.createdAt)}</time>
                  <strong>{record.selectedEmotion}</strong>
                  <p>
                    앱 추정: {record.predictedEmotion}
                    {record.confidence ? ` (${record.confidence}%)` : ''}
                  </p>
                  {record.note && <p className="note">{record.note}</p>}
                </div>
                <button className="icon-button subtle" onClick={() => deleteRecord(record.id)} title="기록 삭제">
                  <Trash2 size={17} />
                </button>
              </article>
            ))
          ) : (
            <div className="empty-records">
              <VideoOff size={28} />
              아직 저장된 기록이 없습니다.
            </div>
          )}
        </div>
      </section>

      {previewRecord && (
        <div className="preview-backdrop" role="presentation" onClick={() => setPreviewRecord(null)}>
          <div className="preview-dialog" role="dialog" aria-modal="true" aria-label="캡처 이미지 미리보기" onClick={(event) => event.stopPropagation()}>
            <div className="preview-toolbar">
              <div>
                <time>{formatTime(previewRecord.createdAt)}</time>
                <strong>{previewRecord.selectedEmotion}</strong>
              </div>
              <div className="preview-actions">
                <button className="utility-button" onClick={() => downloadCapturedImage(previewRecord.capturedImage, previewRecord)}>
                  <Download size={17} />
                  저장
                </button>
                <button className="icon-button" onClick={() => setPreviewRecord(null)} title="닫기">
                  <X size={19} />
                </button>
              </div>
            </div>
            <img className="preview-image" src={previewRecord.capturedImage} alt={`${previewRecord.selectedEmotion} 기록 미리보기`} />
          </div>
        </div>
      )}
    </main>
  );
}

// HMR로 이 모듈이 다시 실행돼도 같은 컨테이너에 root를 중복 생성하지 않도록 재사용한다.
const container = document.getElementById('root');
const root = (container.__reactRoot ??= createRoot(container));
root.render(<App />);
