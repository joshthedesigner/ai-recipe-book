import { Button } from '@mui/material';

interface AddRecipeButtonProps {
  onClick: () => void;
}

export default function AddRecipeButton({ onClick }: AddRecipeButtonProps) {
  return (
    <Button
      variant="contained"
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

