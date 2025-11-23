'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Box,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { FeedItem } from '@/types';

interface FeedNoteCardProps {
  note: FeedItem;
  onClick?: () => void;
}

// Simple relative time formatter
function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}

// Extract and format domain name from URL (matches RecipeCard)
function getSourceName(url: string): string {
  try {
    const domain = new URL(url).hostname;
    // Remove 'www.' prefix
    const cleanDomain = domain.replace(/^www\./, '');
    // Get the main domain name (before first dot)
    const mainName = cleanDomain.split('.')[0];
    // Capitalize first letter
    return mainName.charAt(0).toUpperCase() + mainName.slice(1);
  } catch {
    return 'Source';
  }
}

export default function FeedNoteCard({ note, onClick }: FeedNoteCardProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  if (note.type !== 'note') {
    return null;
  }

  // Check if text is actually truncated (longer than 2 lines)
  useEffect(() => {
    // Use setTimeout to ensure measurement happens after render
    const timer = setTimeout(() => {
      if (textRef.current && note.note_text && !isExpanded) {
        const element = textRef.current;
        // When line-clamp is applied, we need to check if content exceeds 2 lines
        // Create a temporary clone to measure full height
        const clone = element.cloneNode(true) as HTMLElement;
        const computedStyle = window.getComputedStyle(element);
        
        // Set clone styles to match the actual element
        clone.style.position = 'absolute';
        clone.style.visibility = 'hidden';
        clone.style.display = 'block';
        clone.style.width = element.offsetWidth + 'px'; // CRITICAL: Match actual width
        clone.style.setProperty('-webkit-line-clamp', 'none');
        clone.style.overflow = 'visible';
        clone.style.height = 'auto';
        clone.style.maxHeight = 'none';
        clone.style.whiteSpace = computedStyle.whiteSpace;
        clone.style.wordBreak = computedStyle.wordBreak;
        clone.style.fontSize = computedStyle.fontSize;
        clone.style.fontFamily = computedStyle.fontFamily;
        clone.style.lineHeight = computedStyle.lineHeight;
        clone.style.padding = computedStyle.padding;
        clone.style.boxSizing = computedStyle.boxSizing;
        
        document.body.appendChild(clone);
        
        // Force a reflow to ensure clone is measured
        clone.offsetHeight;
        
        const fullHeight = clone.offsetHeight;
        const lineHeight = parseFloat(computedStyle.lineHeight) || 24;
        const maxHeight = lineHeight * 2; // 2 lines
        
        setShowMore(fullHeight > maxHeight);
        document.body.removeChild(clone);
      } else {
        setShowMore(false);
      }
    }, 150); // Increased delay to ensure proper rendering and layout

    return () => clearTimeout(timer);
  }, [note.note_text, isExpanded]);

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (note.recipe_id) {
      // Navigate to recipe page, scroll to notes tab
      router.push(`/recipe/${note.recipe_id}?tab=notes`);
    }
  };

  // Get display image: first note photo or recipe image
  const displayImage = note.photo_urls && note.photo_urls.length > 0
    ? note.photo_urls[0]
    : note.recipe_image_url;

  // Get user name (friend_name or user_name)
  const userName = note.friend_name || note.user_name || 'Unknown';

  return (
    <Card
      elevation={0}
      sx={{
        mb: 3,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        bgcolor: 'background.paper',
        overflow: 'hidden',
      }}
    >
      {/* Header Section - Name + Action Pattern (matches RecipeCard) */}
      <Box
        sx={{
          p: 2,
          pb: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: note.note_text ? 1 : 0 }}>
          {/* Avatar Circle */}
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 600,
              fontSize: '1.1rem',
            }}
          >
            {userName.charAt(0).toUpperCase()}
          </Box>

          {/* Name + Action + Timestamp */}
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
              <Typography
                component="span"
                variant="body1"
                sx={{
                  fontWeight: 600,
                  lineHeight: 1.2,
                }}
              >
                {userName}
              </Typography>
              <Typography
                component="span"
                variant="body1"
                sx={{
                  fontWeight: 400,
                  lineHeight: 1.2,
                }}
              >
                added a note
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              {note.created_at && formatRelativeTime(note.created_at)}
            </Typography>
          </Box>
        </Box>

        {/* Note text in quotes (under the date, aligned with left edge) */}
        {note.note_text && (
          <Box sx={{ py: 1.5 }}>
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'baseline',
              }}
            >
              <Box
                ref={textRef}
                sx={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  color: 'text.primary',
                  fontStyle: 'italic',
                  display: isExpanded ? 'block' : '-webkit-box',
                  WebkitLineClamp: isExpanded ? 'none' : 2, // Show 2 lines with text flowing naturally
                  WebkitBoxOrient: 'vertical',
                  overflow: isExpanded ? 'visible' : 'hidden',
                  textOverflow: 'clip', // Remove default ellipsis
                  fontSize: '1rem',
                  lineHeight: 1.5,
                  flex: '1 1 auto',
                  minWidth: 0, // Allow flex item to shrink
                }}
              >
                "{note.note_text}"
              </Box>
              {!isExpanded && showMore && (
                <Typography
                  component="span"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(true);
                  }}
                  sx={{
                    color: 'text.secondary',
                    cursor: 'pointer',
                    fontWeight: 400,
                    ml: 0.5,
                    fontStyle: 'italic',
                    fontSize: '1rem',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    '&:hover': {
                      textDecoration: 'underline',
                    },
                  }}
                >
                  ...more
                </Typography>
              )}
            </Box>
          </Box>
        )}
      </Box>

      {/* Content Section (matches RecipeCard isEmbedded structure) */}
      <CardActionArea onClick={handleClick} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
        {/* Image */}
        {displayImage && (
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              height: { xs: 296, md: 445 }, // Match RecipeCard embedded height
              overflow: 'hidden',
              bgcolor: 'grey.100', // Background for letterboxing when using contain
            }}
          >
            <img
              src={displayImage}
              alt={note.recipe_title || 'Recipe note'}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain', // Show full photo without cropping
                display: 'block',
              }}
              loading="lazy"
            />
            {/* Photo count indicator if multiple photos */}
            {note.photo_urls && note.photo_urls.length > 1 && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  bgcolor: 'rgba(0,0,0,0.6)',
                  color: 'white',
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                }}
              >
                <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                  {note.photo_urls.length} photos
                </Typography>
              </Box>
            )}
          </Box>
        )}

        <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Recipe Title */}
          {note.recipe_title && (
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5, gap: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.3, flex: 1 }}>
                {note.recipe_title}
              </Typography>
            </Box>
          )}

          {/* Bottom Section: By user and Link to recipe */}
          <Box sx={{ mt: 'auto', pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
              {/* By user */}
              <Typography variant="caption" color="text.secondary">
                By {userName}
              </Typography>
              
              {/* Source link (matches RecipeCard pattern) */}
              {note.source_url ? (
                <Box
                  component="a"
                  href={note.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    color: 'primary.main',
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline',
                    },
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 600,
                    }}
                  >
                    {getSourceName(note.source_url)}
                  </Typography>
                  <OpenInNewIcon sx={{ fontSize: 12 }} />
                </Box>
              ) : null}
            </Box>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

