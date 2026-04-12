package handlers

import "github.com/gofiber/fiber/v2"

// UpdateStatusReq is the body for status updates
type UpdateStatusReq struct {
	Status string `json:"status"`
}

// UpdateModuleStatus godoc
// @Summary      Update module status
// @Description  Updates the status of a specific module
// @Tags         modules
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      string           true  "Module UUID"
// @Param        body body      UpdateStatusReq  true  "Status payload"
// @Router       /modules/status/{id} [post]
func (h *APIHandler) UpdateModuleStatus(c *fiber.Ctx) error {
	moduleID := c.Params("id")
	var body struct {
		Status string `json:"status"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "error": "Invalid body"})
	}

	module, err := h.Module.UpdateStatus(c.Context(), moduleID, body.Status)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "error": "Failed to update module status"})
	}

	return c.JSON(fiber.Map{"success": true, "data": module})
}