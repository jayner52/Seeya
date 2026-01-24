import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { FriendRecommendation } from '@/hooks/useFriendRecommendations';
import { recommendationCategoryConfig, RecommendationCategory } from '@/lib/recommendationCategoryConfig';

interface RecommendationsMapProps {
  recommendations: FriendRecommendation[];
  mapboxToken: string;
  onMarkerClick?: (rec: FriendRecommendation) => void;
  onLocationClick?: (locationKey: string, cityName: string, countryEmoji?: string) => void;
  selectedLocationKey?: string;
}

// Map category to marker color
const categoryColors: Record<string, string> = {
  restaurant: '#f97316', // orange
  activity: '#10b981', // emerald
  stay: '#3b82f6', // blue
  tip: '#f59e0b', // amber
};

// Category emoji for markers
const categoryEmojis: Record<string, string> = {
  restaurant: '🍴',
  activity: '🧭',
  stay: '🏠',
  tip: '💡',
};

export function RecommendationsMap({ recommendations, mapboxToken, onMarkerClick, onLocationClick, selectedLocationKey }: RecommendationsMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Filter recommendations that have coordinates
  const mappableRecommendations = recommendations.filter(
    rec => rec.city?.latitude && rec.city?.longitude
  );

  // Group recommendations by location (using lat/lng as key)
  const groupedByLocation = mappableRecommendations.reduce((acc, rec) => {
    const key = `${rec.city!.latitude!.toFixed(4)},${rec.city!.longitude!.toFixed(4)}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(rec);
    return acc;
  }, {} as Record<string, FriendRecommendation[]>);

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      zoom: 2,
      center: [0, 20],
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: false }),
      'top-right'
    );

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken]);

  // Add/update markers when recommendations change
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    if (mappableRecommendations.length === 0) return;

    const bounds = new mapboxgl.LngLatBounds();

    Object.entries(groupedByLocation).forEach(([key, recs]) => {
      const [lat, lng] = key.split(',').map(Number);
      const firstRec = recs[0];
      const count = recs.length;
      const isCluster = count > 1;
      const isSelected = selectedLocationKey === key;
      const cityName = firstRec.city?.name || 'Unknown location';
      const countryEmoji = firstRec.country?.emoji || '';

      // Create custom marker element
      const el = document.createElement('div');
      el.className = 'recommendation-marker';

      if (isCluster) {
        // Cluster marker with count
        el.style.cssText = `
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border-radius: 50%;
          border: 3px solid ${isSelected ? '#fbbf24' : 'white'};
          box-shadow: ${isSelected ? '0 0 0 3px rgba(251, 191, 36, 0.4), ' : ''}0 2px 10px rgba(99, 102, 241, 0.4);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
          position: relative;
        `;
        // Use textContent instead of innerHTML to prevent XSS
        const countSpan = document.createElement('span');
        countSpan.style.cssText = 'color: white; font-size: 14px; font-weight: 600;';
        countSpan.textContent = String(count);
        el.appendChild(countSpan);
      } else {
        // Single recommendation marker
        const color = categoryColors[firstRec.category] || '#6b7280';
        const emoji = categoryEmojis[firstRec.category] || '📍';
        el.style.cssText = `
          width: 32px;
          height: 32px;
          background-color: ${color};
          border-radius: 50%;
          border: 3px solid ${isSelected ? '#fbbf24' : 'white'};
          box-shadow: ${isSelected ? '0 0 0 3px rgba(251, 191, 36, 0.4), ' : ''}0 2px 8px rgba(0,0,0,0.3);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
        `;
        // Use textContent instead of innerHTML to prevent XSS
        const emojiSpan = document.createElement('span');
        emojiSpan.style.cssText = 'color: white; font-size: 14px;';
        emojiSpan.textContent = emoji;
        el.appendChild(emojiSpan);
      }
      
      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.2)';
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
      });
      
      // Add click handler to filter cards
      el.addEventListener('click', () => {
        if (onLocationClick) {
          onLocationClick(key, cityName, countryEmoji);
        }
      });

      // Create popup content
      let popupContent: string;

      if (isCluster) {
        // Cluster popup showing all recommendations at this location
        
        const recList = recs.map(rec => {
          const color = categoryColors[rec.category] || '#6b7280';
          const emoji = categoryEmojis[rec.category] || '📍';
          const config = recommendationCategoryConfig[rec.category as RecommendationCategory];
          return `
            <div style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                <span style="
                  background-color: ${color}20;
                  color: ${color};
                  padding: 1px 6px;
                  border-radius: 9999px;
                  font-size: 10px;
                  font-weight: 500;
                ">
                  ${emoji} ${config?.label || rec.category}
                </span>
                ${rec.rating ? `
                  <span style="display: flex; align-items: center; gap: 2px; font-size: 10px; color: #6b7280;">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" stroke-width="2">
                      <polygon points="12,2 15,8.5 22,9.3 17,14 18.5,21 12,17.5 5.5,21 7,14 2,9.3 9,8.5"/>
                    </svg>
                    ${rec.rating}
                  </span>
                ` : ''}
              </div>
              <p style="font-weight: 600; font-size: 12px; color: #111827; margin: 0;">${rec.title}</p>
              <p style="font-size: 10px; color: #9ca3af; margin: 2px 0 0 0;">
                by ${rec.profile?.full_name || rec.profile?.username || 'Unknown'}
              </p>
            </div>
          `;
        }).join('');

        popupContent = `
          <div style="min-width: 220px; max-width: 280px; max-height: 300px; overflow-y: auto;">
            <div style="padding: 4px 4px 8px 4px; border-bottom: 2px solid #e5e7eb; margin-bottom: 4px;">
              <h3 style="font-weight: 600; font-size: 14px; color: #111827; margin: 0;">
                ${cityName} ${countryEmoji}
              </h3>
              <p style="font-size: 11px; color: #6b7280; margin: 2px 0 0 0;">
                ${count} recommendations
              </p>
            </div>
            <div style="padding: 0 4px;">
              ${recList}
            </div>
          </div>
        `;
      } else {
        // Single recommendation popup
        const rec = firstRec;
        const color = categoryColors[rec.category] || '#6b7280';
        const emoji = categoryEmojis[rec.category] || '📍';
        const config = recommendationCategoryConfig[rec.category as RecommendationCategory];
        
        popupContent = `
          <div style="min-width: 200px; padding: 4px;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
              <span style="
                background-color: ${color}20;
                color: ${color};
                padding: 2px 8px;
                border-radius: 9999px;
                font-size: 11px;
                font-weight: 500;
                display: flex;
                align-items: center;
                gap: 4px;
              ">
                ${emoji} ${config?.label || rec.category}
              </span>
              ${rec.rating ? `
                <span style="display: flex; align-items: center; gap: 2px; font-size: 11px; color: #6b7280;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" stroke-width="2">
                    <polygon points="12,2 15,8.5 22,9.3 17,14 18.5,21 12,17.5 5.5,21 7,14 2,9.3 9,8.5"/>
                  </svg>
                  ${rec.rating}
                </span>
              ` : ''}
            </div>
            <h3 style="font-weight: 600; margin-bottom: 4px; font-size: 14px; color: #111827;">${rec.title}</h3>
            <p style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">
              ${rec.city?.name}${rec.country?.emoji ? ` ${rec.country.emoji}` : ''}
            </p>
            ${rec.description ? `
              <p style="font-size: 12px; color: #374151; margin-bottom: 8px; line-height: 1.4;">
                ${rec.description.length > 100 ? rec.description.slice(0, 100) + '...' : rec.description}
              </p>
            ` : ''}
            <p style="font-size: 11px; color: #9ca3af;">
              by ${rec.profile?.full_name || rec.profile?.username || 'Unknown'}
            </p>
          </div>
        `;
      }

      const popup = new mapboxgl.Popup({ offset: 25, closeButton: true, maxWidth: '300px' })
        .setHTML(popupContent);

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map.current!);

      markersRef.current.push(marker);
      bounds.extend([lng, lat]);
    });

    // Fit map to show all markers
    if (Object.keys(groupedByLocation).length > 0) {
      map.current.fitBounds(bounds, {
        padding: { top: 50, bottom: 50, left: 50, right: 50 },
        maxZoom: 12,
      });
    }
  }, [mappableRecommendations, mapLoaded, groupedByLocation, selectedLocationKey, onLocationClick]);

  const unmappedCount = recommendations.length - mappableRecommendations.length;

  return (
    <div className="relative">
      <div 
        ref={mapContainer} 
        className="w-full h-[400px] md:h-[500px] rounded-lg overflow-hidden border border-border"
      />
      
      {/* Map Legend */}
      <div className="absolute top-3 left-3 bg-background/95 backdrop-blur-sm rounded-lg p-3 border border-border shadow-sm">
        <p className="text-xs font-medium text-foreground mb-2">Legend</p>
        <div className="space-y-1.5">
          {Object.entries(categoryColors).map(([category, color]) => (
            <div key={category} className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded-full flex items-center justify-center text-[8px]"
                style={{ backgroundColor: color }}
              >
                <span className="text-white">{categoryEmojis[category]}</span>
              </div>
              <span className="text-xs text-muted-foreground capitalize">{category === 'tip' ? 'Tips' : category + 's'}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 pt-1 border-t border-border mt-1">
            <div 
              className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            >
              3
            </div>
            <span className="text-xs text-muted-foreground">Multiple</span>
          </div>
        </div>
      </div>

      {unmappedCount > 0 && (
        <div className="absolute bottom-3 left-3 bg-background/90 backdrop-blur-sm rounded-md px-3 py-1.5 text-xs text-muted-foreground border border-border">
          {unmappedCount} recommendation{unmappedCount > 1 ? 's' : ''} without location data
        </div>
      )}
      {mappableRecommendations.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 rounded-lg">
          <div className="text-center p-4">
            <p className="text-muted-foreground">No recommendations with location data to display</p>
          </div>
        </div>
      )}
    </div>
  );
}
