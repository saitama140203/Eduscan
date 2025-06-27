"use client"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import Cropper from "react-cropper"
import "cropperjs/dist/cropper.css"

export function LogoCropDialog({ open, setOpen, cropSrc, cropperRef, uploading, handleCropAndUpload }) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Cắt ảnh logo</DialogTitle>
        </DialogHeader>
        <div>
          <Cropper
            src={cropSrc}
            ref={cropperRef}
            style={{ height: 300, width: "100%" }}
            aspectRatio={1}
            guides={false}
            viewMode={1}
            minCropBoxWidth={128}
            minCropBoxHeight={128}
            background={false}
            responsive={true}
            checkOrientation={false}
            autoCropArea={1}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Hủy</Button>
          <Button onClick={handleCropAndUpload} disabled={uploading}>
            {uploading ? "Đang tải..." : "Cắt & Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
