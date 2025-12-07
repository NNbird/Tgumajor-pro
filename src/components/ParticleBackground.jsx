import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, Stars, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useLeague } from '../context/LeagueContext';
import logoImg from './logo.png'; 

// --- 1. 生成圆形柔光贴图 ---
function getDotTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64; 
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
  grad.addColorStop(0.6, 'rgba(255, 255, 255, 0.2)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

function GalaxyField() {
  const { playerStats } = useLeague();
  
  // [关键修改] 使用 groupRef 来控制整体旋转
  const groupRef = useRef(); 
  
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [particles, setParticles] = useState(null);
  
  // 用于记录悬停状态和时间的 Refs
  const hoverState = useRef({ index: null, startTime: 0 });
  // 当前实际旋转速度
  const currentRotationSpeed = useRef(0.2);
  
  const texture = useMemo(() => getDotTexture(), []);

  const defaultNames = ['CS2', 'MAJOR', 'AIM', 'AWP', 'RUSH', 'GLHF', 'TGU', 'ACE', 'MVP', 'HEADSHOT'];
  const namePool = useMemo(() => {
      return playerStats.length > 0 ? playerStats : defaultNames.map(n => ({ name: n }));
  }, [playerStats]);

  // --- 2. 解析图片生成粒子 ---
  useEffect(() => {
    const image = new Image();
    image.src = logoImg;
    
    image.onload = () => {
      const width = 200; 
      const height = (image.height / image.width) * width;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, width, height);
      const imgData = ctx.getImageData(0, 0, width, height).data;
      
      const positions = [];
      const colors = [];
      const sizes = [];

      const step = 2; 

      for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
          const index = (y * width + x) * 4;
          const a = imgData[index + 3];

          if (a > 80) { 
            const spread = 60; 
            const posX = (x / width - 0.5) * spread; 
            const posY = -(y / height - 0.5) * spread * (height / width);
            const distFromCenter = Math.sqrt(posX*posX + posY*posY);
            const depthFactor = Math.max(0, (1 - distFromCenter / 30)); 
            const posZ = (Math.random() - 0.5) * (10 + depthFactor * 30); 

            positions.push(posX, posY, posZ);

            const r = imgData[index] / 255;
            const g = imgData[index + 1] / 255;
            const b = imgData[index + 2] / 255;
            colors.push(r, g, b);

            sizes.push(Math.random() * 0.6 + 0.4);
          }
        }
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

      setParticles({ geometry, count: positions.length / 3 });
    };
  }, []);

  // --- 3. 交互与动画循环 ---
  useFrame((state, delta) => {
    // [关键修改] 旋转的是 groupRef，而不是 points
    if (!groupRef.current) return;

    // A. 速度控制逻辑
    let targetSpeed = 0.05; 

    if (hoverState.current.index !== null) {
        const hoverDuration = Date.now() - hoverState.current.startTime;
        if (hoverDuration > 1000) { 
            targetSpeed = 0.002; 
        }
    }

    currentRotationSpeed.current = THREE.MathUtils.lerp(currentRotationSpeed.current, targetSpeed, delta * 2);

    // B. 应用旋转给 Group
    groupRef.current.rotation.y += currentRotationSpeed.current * delta;
    groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.2) * 0.02;
  });

  // --- 4. 优化的指针处理 ---
  const handlePointerMove = (e) => {
    if (e.index !== undefined) {
      e.stopPropagation(); 

      if (hoverState.current.index !== e.index) {
        setHoveredIndex(e.index);
        hoverState.current = { index: e.index, startTime: Date.now() }; 
        document.body.style.cursor = 'crosshair';
      }
    } else {
      if (hoverState.current.index !== null) {
        setHoveredIndex(null);
        hoverState.current = { index: null, startTime: 0 };
        document.body.style.cursor = 'default';
      }
    }
  };

  const handlePointerOut = () => {
    setHoveredIndex(null);
    hoverState.current = { index: null, startTime: 0 };
    document.body.style.cursor = 'default';
  };

  if (!particles) return null;

  return (
    // [关键修改] 包裹在 Group 中
    <group ref={groupRef}>
      <points 
        geometry={particles.geometry}
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
      >
        <pointsMaterial
          size={0.5} 
          vertexColors 
          map={texture}
          transparent
          opacity={0.9}
          alphaTest={0.01}
          sizeAttenuation={true}
          depthWrite={false}
          depthTest={true}
          blending={THREE.AdditiveBlending} 
        />
      </points>

      {/* Tooltip 现在是 Group 的子元素，会跟随 Group 一起旋转 */}
      {hoveredIndex !== null && (
        <Html
          position={[
            particles.geometry.attributes.position.getX(hoveredIndex),
            particles.geometry.attributes.position.getY(hoveredIndex),
            particles.geometry.attributes.position.getZ(hoveredIndex)
          ]}
          style={{ pointerEvents: 'none' }} 
          zIndexRange={[100, 0]}
        >
          <div className="pointer-events-none transform -translate-x-1/2 -translate-y-full mb-2">
              <div className="bg-black/90 border border-yellow-500 text-yellow-400 px-4 py-2 rounded text-sm font-bold shadow-[0_0_25px_rgba(234,179,8,0.6)] backdrop-blur-md whitespace-nowrap animate-in fade-in zoom-in duration-200">
                {namePool[hoveredIndex % namePool.length].name || namePool[hoveredIndex % namePool.length].id}
              </div>
              <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-yellow-500 mx-auto"></div>
          </div>
        </Html>
      )}
    </group>
  );
}

export default function ParticleBackground() {
  return (
    <div className="fixed inset-0 z-0 bg-black">
      <Canvas 
        camera={{ position: [0, 0, 40], fov: 60 }} 
        gl={{ antialias: false, alpha: false }}
        dpr={[1, 1.5]}
        raycaster={{ params: { Points: { threshold: 0.2 } } }}
      >
        <fog attach="fog" args={['#000000', 30, 100]} />
        
        <Stars radius={200} depth={100} count={5000} factor={4} saturation={0} fade speed={0.2} />

        <ambientLight intensity={0.6} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        
        <OrbitControls 
            enablePan={false} 
            enableZoom={true} 
            enableRotate={true} 
            autoRotate={false} 
            rotateSpeed={0.4}
            zoomSpeed={0.8}
            minDistance={5}       
            maxDistance={80}      
        />

        <Suspense fallback={null}>
          <GalaxyField />
        </Suspense>
      </Canvas>
      
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/40 pointer-events-none"></div>
    </div>
  );
}