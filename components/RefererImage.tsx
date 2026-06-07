import React, { useState, useEffect } from 'react';
import { View, ImageProps as RNImageProps } from 'react-native';
import { Image as ExpoImage, ImageContentFit } from 'expo-image';
import { getReferrer } from '../lib/referrer';

export interface RefererImageProps extends RNImageProps {
  source: any;
}

export default function RefererImage(props: RefererImageProps) {
  const [referrer, setReferrer] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    getReferrer().then((ref) => {
      if (mounted) {
        setReferrer(ref);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (referrer === null && props.source?.uri) {
    // Render a transparent placeholder with the same style to prevent layout shifts
    return <View style={props.style as any} />;
  }

  let source = props.source;
  if (source?.uri) {
    source = {
      ...source,
      headers: {
        ...(source.headers || {}),
        ...(referrer ? { Referer: referrer } : {}),
      },
    };
  }

  const { resizeMode, defaultSource, tintColor, ...rest } = props;
  
  let contentFit: ImageContentFit = 'cover';
  if (resizeMode === 'contain') contentFit = 'contain';
  else if (resizeMode === 'stretch') contentFit = 'fill';
  else if (resizeMode === 'center') contentFit = 'none';

  return (
    <ExpoImage
      {...(rest as any)}
      tintColor={tintColor as string | undefined}
      source={source}
      contentFit={contentFit}
      placeholder={defaultSource}
      transition={200}
    />
  );
}
