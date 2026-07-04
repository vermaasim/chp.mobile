import { forwardRef, Fragment, useImperativeHandle, useRef } from 'react';
import MapView, { Circle, Marker, type Region } from 'react-native-maps';
import type { AppMapHandle, AppMapProps } from './AppMap.types';

export const AppMap = forwardRef<AppMapHandle, AppMapProps>(function AppMap(
  { region, allowedLocations, userLocation, radiusMeters, onRegionChangeComplete },
  ref,
) {
  const mapRef = useRef<MapView | null>(null);

  useImperativeHandle(ref, () => ({
    animateToRegion: (nextRegion, duration = 250) => {
      mapRef.current?.animateToRegion(nextRegion as Region, duration);
    },
  }));

  return (
    <MapView
      ref={mapRef}
      style={{ height: 200, width: '100%' }}
      initialRegion={region}
      onRegionChangeComplete={(nextRegion) => onRegionChangeComplete(nextRegion)}
      showsMyLocationButton
    >
      {allowedLocations.map((location) => (
        <Fragment key={location.id}>
          <Marker
            coordinate={{ latitude: location.latitude, longitude: location.longitude }}
            title={location.name}
            pinColor="#22C55E"
          />
          <Circle
            center={{ latitude: location.latitude, longitude: location.longitude }}
            radius={radiusMeters}
            strokeColor="rgba(34, 197, 94, 0.75)"
            fillColor="rgba(34, 197, 94, 0.15)"
          />
        </Fragment>
      ))}

      {userLocation ? <Marker coordinate={userLocation} title="You" pinColor="#0EA5E9" /> : null}
    </MapView>
  );
});
