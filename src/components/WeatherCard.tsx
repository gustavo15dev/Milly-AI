import React, { useState, useEffect } from 'react';
import { CloudSun, Cloud, CloudFog, CloudDrizzle, CloudRain, Snowflake, CloudLightning, Sun, Moon } from 'lucide-react';

interface WeatherCardProps {
  city: string;
}

const weatherCodeMap: Record<number, { text: string, icon: React.ElementType }> = {
  0: { text: 'Céu limpo', icon: Sun },
  1: { text: 'Maiormente limpo', icon: CloudSun },
  2: { text: 'Parcialmente nublado', icon: CloudSun },
  3: { text: 'Nublado', icon: Cloud },
  45: { text: 'Nevoeiro', icon: CloudFog },
  48: { text: 'Nevoeiro com geada', icon: CloudFog },
  51: { text: 'Garoa leve', icon: CloudDrizzle },
  53: { text: 'Garoa moderada', icon: CloudDrizzle },
  55: { text: 'Garoa densa', icon: CloudDrizzle },
  56: { text: 'Garoa congelante leve', icon: CloudDrizzle },
  57: { text: 'Garoa congelante densa', icon: CloudDrizzle },
  61: { text: 'Chuva fraca', icon: CloudRain },
  63: { text: 'Chuva moderada', icon: CloudRain },
  65: { text: 'Chuva forte', icon: CloudRain },
  66: { text: 'Chuva congelante leve', icon: CloudRain },
  67: { text: 'Chuva congelante forte', icon: CloudRain },
  71: { text: 'Neve fraca', icon: Snowflake },
  73: { text: 'Neve moderada', icon: Snowflake },
  75: { text: 'Neve forte', icon: Snowflake },
  77: { text: 'Grãos de neve', icon: Snowflake },
  80: { text: 'Pancadas de chuva fracas', icon: CloudRain },
  81: { text: 'Pancadas de chuva moderadas', icon: CloudRain },
  82: { text: 'Pancadas de chuva fortes', icon: CloudRain },
  85: { text: 'Pancadas de neve fracas', icon: Snowflake },
  86: { text: 'Pancadas de neve fortes', icon: Snowflake },
  95: { text: 'Trovoada', icon: CloudLightning },
  96: { text: 'Trovoada com granizo leve', icon: CloudLightning },
  99: { text: 'Trovoada com granizo forte', icon: CloudLightning },
};

const getDayName = (dateStr: string) => {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
};

const formatDate = () => {
  return new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
};

export const WeatherCard: React.FC<WeatherCardProps> = ({ city }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // 1. Geocoding
        const cacheKey = `geo_${city.toLowerCase()}`;
        let geoData = JSON.parse(localStorage.getItem(cacheKey) || 'null');
        
        if (!geoData) {
          const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`);
          const geoJson = await geoRes.json();
          
          if (!geoJson.results || geoJson.results.length === 0) {
            throw new Error('Cidade não encontrada');
          }
          geoData = geoJson.results[0];
          localStorage.setItem(cacheKey, JSON.stringify(geoData));
        }

        // 2. Weather
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${geoData.latitude}&longitude=${geoData.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`);
        const weatherJson = await weatherRes.json();

        setData({
          cityName: `${geoData.name}, ${geoData.country_code}`,
          current: weatherJson.current,
          daily: weatherJson.daily
        });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (city) {
      fetchWeather();
    }
  }, [city]);

  if (loading) {
    return (
      <div className="w-[550px] max-w-full h-[220px] bg-slate-100 rounded-[28px] animate-pulse mb-4"></div>
    );
  }

  if (error || !data) {
    return null;
  }

  const currentCode = data.current.weather_code;
  const isDay = data.current.is_day === 1;
  const weatherInfo = weatherCodeMap[currentCode] || { text: 'Desconhecido', icon: Cloud };
  
  // Se for noite e céu limpo, usar ícone de lua
  const CurrentIcon = (currentCode === 0 && !isDay) ? Moon : weatherInfo.icon;

  return (
    <div className="flex w-full max-w-[550px] h-auto sm:h-[220px] flex-col sm:flex-row bg-gradient-to-br from-blue-900 to-blue-500 rounded-[28px] text-white p-6 shadow-[0_15px_35px_rgba(59,130,246,0.3)] relative overflow-hidden mb-4 font-sans">
      {/* Lado Esquerdo: Principal */}
      <div className="flex-[1.2] flex flex-col justify-between mb-4 sm:mb-0">
        <div>
          <h2 className="text-2xl font-bold m-0">{data.cityName}</h2>
          <div className="text-sm opacity-80 mb-2 capitalize">{formatDate()}</div>
        </div>
        
        <div className="flex items-center gap-4 my-2">
          <span className="text-5xl font-bold">{Math.round(data.current.temperature_2m)}°</span>
          <div className="flex flex-col items-center">
            <CurrentIcon className="w-8 h-8 mb-1" />
            <div className="text-base capitalize font-medium">{weatherInfo.text}</div>
          </div>
        </div>
      </div>

      {/* Lado Direito: Detalhes e Mini Forecast */}
      <div className="flex-1 bg-white/10 backdrop-blur-md rounded-2xl p-4 flex flex-col justify-between">
        <div className="grid grid-cols-2 gap-2 text-xs border-b border-white/20 pb-3">
          <div>
            <span className="block opacity-70 text-[10px] uppercase">Umidade</span>
            <b className="text-sm">{data.current.relative_humidity_2m}%</b>
          </div>
          <div>
            <span className="block opacity-70 text-[10px] uppercase">Vento</span>
            <b className="text-sm">{data.current.wind_speed_10m} km/h</b>
          </div>
          <div>
            <span className="block opacity-70 text-[10px] uppercase">Sensação</span>
            <b className="text-sm">{Math.round(data.current.apparent_temperature)}°</b>
          </div>
          <div>
            <span className="block opacity-70 text-[10px] uppercase">UV</span>
            <b className="text-sm">Baixo</b>
          </div>
        </div>

        <div className="flex justify-between mt-3">
          {data.daily.time.slice(1, 4).map((time: string, idx: number) => {
            const code = data.daily.weather_code[idx + 1];
            const DayIcon = weatherCodeMap[code]?.icon || Cloud;
            const maxTemp = Math.round(data.daily.temperature_2m_max[idx + 1]);
            
            return (
              <div key={time} className="text-center text-xs flex flex-col items-center">
                <span className="capitalize">{idx === 0 ? 'Amanhã' : getDayName(time)}</span>
                <DayIcon className="w-4 h-4 my-1" />
                <b className="text-sm">{maxTemp}°</b>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
