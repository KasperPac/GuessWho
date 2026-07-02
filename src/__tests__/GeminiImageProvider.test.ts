import { GeminiImageProvider } from "@/lib/image-generation/GeminiImageProvider";

const mockCreate = jest.fn();

jest.mock("@google/genai", () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    interactions: { create: mockCreate },
  })),
}));

describe("GeminiImageProvider — generateImage", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    mockCreate.mockResolvedValue({
      output_image: { data: "ZmFrZS1pbWFnZS1kYXRh", mime_type: "image/png" },
    });
  });

  it("sends only the text part when referenceImageUrls is empty", async () => {
    const provider = new GeminiImageProvider("fake-key");
    const result = await provider.generateImage("a text-only prompt", []);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const call = mockCreate.mock.calls[0][0];
    expect(call.input).toHaveLength(1);
    expect(call.input[0]).toEqual({ type: "text", text: "a text-only prompt" });
    expect(result.imageData).toBe("ZmFrZS1pbWFnZS1kYXRh");
  });

  it("does not throw when referenceImageUrls is empty", async () => {
    const provider = new GeminiImageProvider("fake-key");
    await expect(provider.generateImage("prompt", [])).resolves.toBeDefined();
  });

  it("sends a text part and an image part per reference URL", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
      headers: { get: () => "image/jpeg" },
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const provider = new GeminiImageProvider("fake-key");
    await provider.generateImage("prompt", ["https://example.com/ref.jpg"]);

    const call = mockCreate.mock.calls[0][0];
    expect(call.input).toHaveLength(2);
    expect(call.input[0]).toEqual({ type: "text", text: "prompt" });
    expect(call.input[1]).toMatchObject({ type: "image", mime_type: "image/jpeg" });
    expect(fetchMock).toHaveBeenCalledWith("https://example.com/ref.jpg");
  });
});
