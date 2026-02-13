'use client';

import { Box } from '@mui/material';
import { motion } from 'framer-motion';
import CameraAltOutlinedIcon from '@mui/icons-material/CameraAltOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import ContentPasteOutlinedIcon from '@mui/icons-material/ContentPasteOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

interface Feature {
  icon: React.ReactNode;
  title: string;
  desc: string;
}

const features: Feature[] = [
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
];

const customEasing: [number, number, number, number] = [0.32, 0.72, 0, 1];

export default function BrowseEmptyState() {
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
      {/* Content Container */}
      <Box
        sx={{
          width: '100%',
          maxWidth: '448px',
          position: 'relative',
        }}
      >
        {/* Subtitle - Get Started */}
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
          Get Started
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
          Add recipes.
        </Box>

        {/* Features */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {features.map((feature, index) => (
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
      </Box>
    </Box>
  );
}
