import { Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

interface AddRecipeButtonProps {
  onClick: () => void;
}

export default function AddRecipeButton({ onClick }: AddRecipeButtonProps) {
  return (
    <Button
      variant="contained"
      startIcon={<AddIcon />}
      onClick={onClick}
      sx={{
        borderRadius: '12px',
        textTransform: 'none',
        fontWeight: 600,
        px: 3,
        boxShadow: '0 2px 8px rgba(25, 118, 210, 0.25)',
        '&:hover': {
          boxShadow: '0 4px 12px rgba(25, 118, 210, 0.35)',
        },
      }}
    >
      Add Recipe
    </Button>
  );
}

