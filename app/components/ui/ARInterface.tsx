import React, { useEffect, useState } from 'react';
import { Monitor, Wifi, Battery, Thermometer, Zap } from 'lucide-react';

export default function ARInterface() {
  const [time, setTime] = useState(new Date());
  const [systemTemp, setSystemTemp] = useState(42);
  const [batteryLevel, setBatteryLevel] = useState(87);
  const [signalStrength, setSignalStrength] = useState(95);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
      setSystemTemp(42 + Math.random() * 8);
      setBatteryLevel(87 + Math.random() * 10);
      setSignalStrength(90 + Math.random() * 10);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {/* Top HUD */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex justify-between items-center h-full px-6 text-cyan-400 font-mono text-sm">
          <div className="flex items-center space-x-6">
            <div className="text-green-400">
              <span className="animate-pulse">●</span> NEURAL_LINK_ACTIVE
            </div>
            <div>
              TEMP: {systemTemp.toFixed(1)}°C
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            <div>
              {time.toLocaleTimeString()}
            </div>
            <div>
              BAT: {batteryLevel.toFixed(0)}%
            </div>
            <div>
              SIG: {signalStrength.toFixed(0)}%
            </div>
          </div>
        </div>
      </div>

      {/* Bottom HUD */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex justify-between items-center h-full px-6 text-cyan-400 font-mono text-sm">
          <div className="flex items-center space-x-6">
            <div>
              SCAN_STATUS: <span className="text-green-400">ACTIVE</span>
            </div>
            <div>
              MEMORY_ACCESS: <span className="text-yellow-400">GRANTED</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            <div>
              UPLINK: <span className="text-green-400 animate-pulse">CONNECTED</span>
            </div>
            <div>
              CHARLY_MK1
            </div>
          </div>
        </div>
      </div>

      {/* Corner Elements */}
      <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-cyan-400" />
      <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-cyan-400" />
      <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-cyan-400" />
      <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-cyan-400" />

      {/* Crosshair */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className="relative w-8 h-8">
          <div className="absolute top-1/2 left-0 w-2 h-px bg-cyan-400" />
          <div className="absolute top-1/2 right-0 w-2 h-px bg-cyan-400" />
          <div className="absolute left-1/2 top-0 w-px h-2 bg-cyan-400" />
          <div className="absolute left-1/2 bottom-0 w-px h-2 bg-cyan-400" />
          <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-cyan-400 rounded-full transform -translate-x-1/2 -translate-y-1/2" />
        </div>
      </div>
    </div>
  );
};

