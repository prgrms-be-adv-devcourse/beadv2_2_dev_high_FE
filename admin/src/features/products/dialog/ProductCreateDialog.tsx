import { Dialog } from "@mui/material";
import React from "react";

const ProductCreateDialog = ({
  openCreateDialog,
  setOpenCreateDialog,
}: any) => {
  return (
    <Dialog
      open={openCreateDialog}
      onClose={() => setOpenCreateDialog(false)}
      maxWidth="md"
      fullWidth
    >
      ProductCreateDialog
    </Dialog>
  );
};

export default ProductCreateDialog;
