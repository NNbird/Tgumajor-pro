import React from 'react';

// side: 'left' (Team A) | 'right' (Team B)
export default function MatchMascot({ url, side }) {
  if (!url) return null;

  // 🎥 摄像机角度控制朝向
  // 假设模型默认是正脸朝前 (0deg)
  // Left Side (Team A): 我们想看它的侧脸，让它看起来面向右边 -> 摄像机移到它的左侧 (-45deg)
  // Right Side (Team B): 我们想看它的侧脸，让它看起来面向左边 -> 摄像机移到它的右侧 (45deg)
  const cameraOrbit = side === 'left' 
    ? '-35deg 75deg 105%'  // 左侧战队：摄像机左偏，视觉上吉祥物朝右
    : '35deg 75deg 105%';  // 右侧战队：摄像机右偏，视觉上吉祥物朝左

  return (
    <div className={`relative w-24 h-24 md:w-32 md:h-32 shrink-0 ${side === 'left' ? '-mr-4 z-0' : '-ml-4 z-0 order-last'}`}>
      {/* 底部光晕底座特效 */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-16 h-4 bg-purple-500/20 blur-xl rounded-full"></div>
      
      <model-viewer
        src={url}
        camera-orbit={cameraOrbit}
        disable-zoom
        disable-pan
        interaction-prompt="none" // 禁止小手提示
        //auto-rotate // 微微自动旋转增加动感
        //rotation-per-second="5deg" // 旋转速度很慢，保持姿态
        shadow-intensity="1"
        shadow-softness="0.5"
        style={{ width: '100%', height: '100%' }}
      ></model-viewer>
    </div>
  );
}