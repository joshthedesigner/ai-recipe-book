'use client';

import { useState } from 'react';
import { Box } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import CameraAltOutlinedIcon from '@mui/icons-material/CameraAltOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import ContentPasteOutlinedIcon from '@mui/icons-material/ContentPasteOutlined';
import RestaurantOutlinedIcon from '@mui/icons-material/RestaurantOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

interface Feature {
  icon: React.ReactNode;
  title: string;
  desc: string;
}

interface Slide {
  heading: string;
  subtitle: string;
  features: Feature[];
}

const slides: Slide[] = [
  {
    heading: 'Add recipes.',
    subtitle: 'Get Started',
    features: [
      {
        icon: <CameraAltOutlinedIcon sx={{ fontSize: 17 }} />,
        title: 'Photo',
        desc: 'Snap a photo of a written recipe. We read it.',
      },
      {
        icon: <LinkOutlinedIcon sx={{ fontSize: 17 }} />,
        title: 'URL',
        desc: 'Paste a link. Done.',
      },
      {
        icon: <ContentPasteOutlinedIcon sx={{ fontSize: 17 }} />,
        title: 'Text',
        desc: 'Copy and paste raw text, it works too.',
      },
    ],
  },
  {
    heading: 'Organize recipes.',
    subtitle: 'Get Started',
    features: [
      {
        icon: <RestaurantOutlinedIcon sx={{ fontSize: 17 }} />,
        title: 'Filter',
        desc: 'By cuisine or main ingredient.',
      },
      {
        icon: <SearchOutlinedIcon sx={{ fontSize: 17 }} />,
        title: 'Search',
        desc: 'By name or anything else.',
      },
      {
        icon: <FavoriteBorderIcon sx={{ fontSize: 17 }} />,
        title: 'Favorites',
        desc: 'One tap. Always there.',
      },
    ],
  },
  {
    heading: 'Cook recipes.',
    subtitle: 'Get Started',
    features: [
      {
        icon: <MenuBookOutlinedIcon sx={{ fontSize: 17 }} />,
        title: 'Clean view',
        desc: 'No noise. Just steps.',
      },
      {
        icon: <OpenInNewIcon sx={{ fontSize: 17 }} />,
        title: 'Source',
        desc: 'Original link saved.',
      },
      {
        icon: <ChatBubbleOutlineIcon sx={{ fontSize: 17 }} />,
        title: 'AI assist',
        desc: 'Ask anything mid-cook.',
      },
    ],
  },
];

const customEasing: [number, number, number, number] = [0.32, 0.72, 0, 1];

export default function BrowseEmptyState() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setDirection(1);
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setDirection(-1);
      setCurrentSlide(currentSlide - 1);
    }
  };

  const goToSlide = (index: number) => {
    setDirection(index > currentSlide ? 1 : -1);
    setCurrentSlide(index);
  };

  const slideVariants = {
    enter: {
      y: 24,
      opacity: 0,
    },
    center: {
      y: 0,
      opacity: 1,
    },
    exit: {
      y: -16,
      opacity: 0,
    },
  };

  const featureVariants = {
    hidden: {
      opacity: 0,
      y: 16,
    },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: 0.12 + i * 0.08,
        duration: 0.45,
        ease: customEasing,
      },
    }),
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
        px: 3,
      }}
    >
      {/* Carousel Container - No Card */}
      <Box
        sx={{
          width: '100%',
          maxWidth: '448px',
          position: 'relative',
        }}
      >
        {/* Slide Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              duration: 0.45,
              ease: customEasing,
            }}
          >
            {/* Subtitle - Now on top */}
            <Box
              component="p"
              sx={{
                fontSize: '1.125rem',
                letterSpacing: '0.025em',
                color: 'text.primary',
                opacity: 0.7,
                textAlign: 'center',
                m: 0,
                mb: 1,
              }}
            >
              {slides[currentSlide].subtitle}
            </Box>

            {/* Heading */}
            <Box
              component="h1"
              sx={{
                fontSize: { xs: '2.5rem', md: '3.5rem' },
                fontWeight: 700,
                lineHeight: 1,
                letterSpacing: '-0.05em',
                color: 'text.primary',
                textAlign: 'center',
                m: 0,
                mb: 5,
              }}
            >
              {slides[currentSlide].heading}
            </Box>

            {/* Features */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {slides[currentSlide].features.map((feature, index) => (
                <motion.div
                  key={index}
                  custom={index}
                  variants={featureVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2.5,
                      borderRadius: '16px',
                      bgcolor: 'action.hover',
                      px: '20px',
                      py: '16px',
                      transition: 'all 0.2s ease',
                      cursor: 'default',
                      position: 'relative',
                      '&:hover': {
                        bgcolor: 'action.selected',
                        '& .feature-icon': {
                          color: 'text.primary',
                        },
                        '& .arrow-icon': {
                          opacity: 1,
                          transform: 'translateX(0)',
                        },
                      },
                    }}
                  >
                    {/* Icon - No Container */}
                    <Box
                      className="feature-icon"
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        color: 'text.secondary',
                        transition: 'color 0.2s ease',
                      }}
                    >
                      {feature.icon}
                    </Box>

                    {/* Text Content */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box
                        sx={{
                          fontSize: '0.9375rem',
                          fontWeight: 600,
                          color: 'text.primary',
                          mb: 0.25,
                          lineHeight: 1.4,
                        }}
                      >
                        {feature.title}
                      </Box>
                      <Box
                        sx={{
                          fontSize: '0.875rem',
                          color: 'text.primary',
                          opacity: 0.6,
                          lineHeight: 1.5,
                        }}
                      >
                        {feature.desc}
                      </Box>
                    </Box>

                    {/* Hidden Arrow - Slides in on Hover */}
                    <ArrowForwardIcon
                      className="arrow-icon"
                      sx={{
                        fontSize: 16,
                        color: 'text.secondary',
                        opacity: 0,
                        transform: 'translateX(-4px)',
                        transition: 'all 0.2s ease',
                        flexShrink: 0,
                      }}
                    />
                  </Box>
                </motion.div>
              ))}
            </Box>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <Box sx={{ mt: 7 }}>
          {/* Row 1: Counter and Prev/Next */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 3,
            }}
          >
            {/* Slide Counter */}
            <Box
              sx={{
                fontSize: '0.7rem',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '0.1em',
                color: 'text.primary',
                opacity: 0.5,
              }}
            >
              0{currentSlide + 1} — 0{slides.length}
            </Box>

            {/* Prev/Next Buttons */}
            <Box sx={{ display: 'flex', gap: 3 }}>
              <Box
                component="button"
                onClick={prevSlide}
                disabled={currentSlide === 0}
                sx={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'text.primary',
                  cursor: currentSlide === 0 ? 'not-allowed' : 'pointer',
                  opacity: currentSlide === 0 ? 0.3 : 1,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    color: currentSlide === 0 ? 'text.primary' : 'primary.main',
                  },
                }}
              >
                Prev
              </Box>
              <Box
                component="button"
                onClick={nextSlide}
                disabled={currentSlide === slides.length - 1}
                sx={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'text.primary',
                  cursor: currentSlide === slides.length - 1 ? 'not-allowed' : 'pointer',
                  opacity: currentSlide === slides.length - 1 ? 0.3 : 1,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    color: currentSlide === slides.length - 1 ? 'text.primary' : 'primary.main',
                  },
                }}
              >
                Next
              </Box>
            </Box>
          </Box>

          {/* Row 2: Progress Bar */}
          <Box sx={{ display: 'flex', gap: 0.75 }}>
            {slides.map((_, index) => (
              <Box
                key={index}
                component="button"
                onClick={() => goToSlide(index)}
                sx={{
                  flex: 1,
                  height: '3px',
                  borderRadius: '999px',
                  bgcolor: 'divider',
                  position: 'relative',
                  overflow: 'hidden',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  transition: 'opacity 0.2s ease',
                  '&:hover': {
                    opacity: 0.7,
                  },
                }}
              >
                <Box
                  component={motion.div}
                  initial={false}
                  animate={{
                    width: index <= currentSlide ? '100%' : '0%',
                  }}
                  transition={{
                    duration: 0.6,
                    ease: customEasing,
                  }}
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    bgcolor: 'text.primary',
                  }}
                />
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
