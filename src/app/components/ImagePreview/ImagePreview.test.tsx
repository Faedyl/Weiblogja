'use client'

import { useState } from 'react'
import ImagePreview from './ImagePreview'
import styles from './ImagePreview.module.css'

// Sample images for testing
const SAMPLE_IMAGES = [
  {
    src: 'https://picsum.photos/800/600',
    alt: 'Sample landscape image',
    caption: 'This is a sample landscape image with a descriptive caption that demonstrates how longer text will be displayed in the caption area.'
  },
  {
    src: 'https://picsum.photos/600/800',
    alt: 'Sample portrait image',
    caption: 'This is a sample portrait image showing how the component handles different aspect ratios.'
  },
  {
    src: 'https://httpstat.us/404',
    alt: 'Broken image test',
    caption: 'This tests the error handling for broken images.'
  }
];

export default function ImagePreviewTest() {
  const [selectedImage, setSelectedImage] = useState(0);
  
  return (
    <div className={styles.testContainer}>
      <h2>Image Preview Component Test</h2>
      
      {/* Test different sizes */}
      <div className={styles.testSection}>
        <h3>Small Image (400x300)</h3>
        <ImagePreview
          src={SAMPLE_IMAGES[0].src}
          alt={SAMPLE_IMAGES[0].alt}
          width={400}
          height={300}
          caption={SAMPLE_IMAGES[0].caption}
          priority={true}
        />
      </div>
      
      <div className={styles.testSection}>
        <h3>Medium Image (800x600) - Default</h3>
        <ImagePreview
          src={SAMPLE_IMAGES[0].src}
          alt={SAMPLE_IMAGES[0].alt}
          caption={SAMPLE_IMAGES[0].caption}
        />
      </div>
      
      <div className={styles.testSection}>
        <h3>Large Image (1200x800)</h3>
        <ImagePreview
          src={SAMPLE_IMAGES[0].src}
          alt={SAMPLE_IMAGES[0].alt}
          width={1200}
          height={800}
          caption={SAMPLE_IMAGES[0].caption}
        />
      </div>
      
      {/* Test different aspect ratios */}
      <div className={styles.testSection}>
        <h3>Portrait Image</h3>
        <ImagePreview
          src={SAMPLE_IMAGES[1].src}
          alt={SAMPLE_IMAGES[1].alt}
          caption={SAMPLE_IMAGES[1].caption}
        />
      </div>
      
      {/* Test error handling */}
      <div className={styles.testSection}>
        <h3>Error Handling Test</h3>
        <ImagePreview
          src={SAMPLE_IMAGES[2].src}
          alt={SAMPLE_IMAGES[2].alt}
          caption={SAMPLE_IMAGES[2].caption}
        />
      </div>
      
      {/* Test with different captions */}
      <div className={styles.testSection}>
        <h3>Short Caption</h3>
        <ImagePreview
          src={SAMPLE_IMAGES[0].src}
          alt={SAMPLE_IMAGES[0].alt}
          caption="Short caption"
        />
      </div>
      
      <div className={styles.testSection}>
        <h3>No Caption</h3>
        <ImagePreview
          src={SAMPLE_IMAGES[0].src}
          alt={SAMPLE_IMAGES[0].alt}
        />
      </div>
      
      {/* Test priority loading */}
      <div className={styles.testSection}>
        <h3>Priority Loading Test</h3>
        <ImagePreview
          src={SAMPLE_IMAGES[0].src}
          alt={SAMPLE_IMAGES[0].alt}
          caption="This image should load with priority"
          priority={true}
        />
      </div>
      
      {/* Test lazy loading */}
      <div className={styles.testSection} style={{ height: '100vh' }}></div>
      <div className={styles.testSection}>
        <h3>Lazy Loading Test (scroll down to see)</h3>
        <ImagePreview
          src={SAMPLE_IMAGES[0].src}
          alt={SAMPLE_IMAGES[0].alt}
          caption="This image should lazy load when scrolled into view"
        />
      </div>
    </div>
  );
}