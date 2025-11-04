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
        borderRadius: 0,
        textTransform: 'none',
        fontWeight: 600,
        color: 'white',
        px: 3,
        py: 1.25,
        boxShadow: 'none',
        '&:hover': {
          boxShadow: 'none',
        },
      }}
    >
      Add Recipe
    </Button>
  );
}

