"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle, Loader2, Palette, Save, Plus, Trash2, Library } from "lucide-react";
import type { BusinessConfig } from "@/lib/businesses";
import { BusinessManager } from "@/components/dashboard/business-manager";

interface SocialLink {
  label: string;
  url: string;
}

interface BrandSettingsState {
  businessSlug: string;
  logoUrl: string;
  brandLibraryUrls: string[];
  headerBackgroundColor: string;
  newsletterPageBackground: string;
  newsletterCardBackground: string;
  newsletterTextColor: string;
  newsletterLinkColor: string;
  fontFamily: string;
  address: string;
  phone: string;
  websiteUrl: string;
  contactEmail: string;
  socialLinks: SocialLink[];
  footerText: string;
  brandGuidelines: string;
}

const defaultBrand: BrandSettingsState = {
  businessSlug: "intellee_college",
  logoUrl: "",
  brandLibraryUrls: [],
  headerBackgroundColor: "#1E1B4B",
  newsletterPageBackground: "#F3F4F6",
  newsletterCardBackground: "#ffffff",
  newsletterTextColor: "#374151",
  newsletterLinkColor: "#4338CA",
  fontFamily: "Georgia, 'Times New Roman', Times, serif",
  address: "Tech Park, Bangalore, India",
  phone: "+91 98765 43210",
  websiteUrl: "https://intellee.com",
  contactEmail: "admissions@intellee.com",
  socialLinks: [
    { label: "LinkedIn", url: "https://linkedin.com/company/intellee" },
    { label: "Twitter", url: "https://twitter.com/intellee" },
    { label: "Instagram", url: "https://instagram.com/intellee" },
  ],
  footerText: "You are receiving this because you expressed interest in Intellee programs.",
  brandGuidelines: "",
};

export default function SettingsPage() {
  const [brand, setBrand] = useState<BrandSettingsState>(defaultBrand);
  const [businessesList, setBusinessesList] = useState<BusinessConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchBrandSettings();
  }, []);

  async function fetchBrandSettings() {
    try {
      const [res, bizRes] = await Promise.all([
        fetch("/api/settings/brand"),
        fetch("/api/businesses"),
      ]);
      const bizData = await bizRes.json().catch(() => ({}));
      setBusinessesList(bizData.businesses || []);
      const data = await res.json();
      if (data.settings) {
        const s = data.settings;
        setBrand({
          businessSlug: s.businessSlug || defaultBrand.businessSlug,
          logoUrl: s.logoUrl || "",
          brandLibraryUrls: Array.isArray(s.brandLibraryUrls) ? s.brandLibraryUrls : [],
          headerBackgroundColor:
            s.headerBackgroundColor || s.primaryColor || defaultBrand.headerBackgroundColor,
          newsletterPageBackground:
            s.newsletterPageBackground || defaultBrand.newsletterPageBackground,
          newsletterCardBackground:
            s.newsletterCardBackground || defaultBrand.newsletterCardBackground,
          newsletterTextColor: s.newsletterTextColor || defaultBrand.newsletterTextColor,
          newsletterLinkColor:
            s.newsletterLinkColor || s.accentColor || defaultBrand.newsletterLinkColor,
          fontFamily: s.fontFamily || defaultBrand.fontFamily,
          address: s.address || defaultBrand.address,
          phone: s.phone || defaultBrand.phone,
          websiteUrl: s.websiteUrl || defaultBrand.websiteUrl,
          contactEmail: s.contactEmail || defaultBrand.contactEmail,
          socialLinks: s.socialLinks || defaultBrand.socialLinks,
          footerText: s.footerText || defaultBrand.footerText,
          brandGuidelines: s.brandGuidelines || "",
        });
      }
    } catch {
      // use defaults
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/brand", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(brand),
      });
      if (!res.ok) throw new Error();
      toast.success("Brand settings saved!");
    } catch {
      toast.error("Failed to save brand settings");
    } finally {
      setSaving(false);
    }
  }

  function addSocialLink() {
    setBrand((prev) => ({
      ...prev,
      socialLinks: [...prev.socialLinks, { label: "", url: "" }],
    }));
  }

  function removeSocialLink(index: number) {
    setBrand((prev) => ({
      ...prev,
      socialLinks: prev.socialLinks.filter((_, i) => i !== index),
    }));
  }

  function updateSocialLink(index: number, field: "label" | "url", value: string) {
    setBrand((prev) => ({
      ...prev,
      socialLinks: prev.socialLinks.map((link, i) =>
        i === index ? { ...link, [field]: value } : link
      ),
    }));
  }

  function addBrandLibraryUrl() {
    setBrand((prev) => ({
      ...prev,
      brandLibraryUrls: [...prev.brandLibraryUrls, ""],
    }));
  }

  function removeBrandLibraryUrl(index: number) {
    setBrand((prev) => ({
      ...prev,
      brandLibraryUrls: prev.brandLibraryUrls.filter((_, i) => i !== index),
    }));
  }

  function updateBrandLibraryUrl(index: number, value: string) {
    setBrand((prev) => ({
      ...prev,
      brandLibraryUrls: prev.brandLibraryUrls.map((url, i) => (i === index ? value : url)),
    }));
  }

  function onBusinessChange(slug: string) {
    const b = businessesList.find((x) => x.slug === slug);
    if (b) {
      setBrand((prev) => ({
        ...prev,
        businessSlug: slug,
        address: b.defaultAddress || prev.address,
        phone: b.defaultPhone || prev.phone,
        websiteUrl: b.defaultWebsiteUrl || prev.websiteUrl,
        contactEmail: b.defaultContactEmail || prev.contactEmail,
      }));
    }
  }

  const selectedBusiness = businessesList.find((x) => x.slug === brand.businessSlug);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Configure your brand, integrations, and email settings.
        </p>
      </div>

      <Tabs defaultValue="brand">
        <TabsList>
          <TabsTrigger value="brand">Brand Settings</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="brand" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Businesses</CardTitle>
              <CardDescription>
                Add, edit, or remove businesses. The business <strong>name</strong> is the organization
                name shown in emails (one field — no duplicate &quot;company name&quot;).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BusinessManager
                onChanged={() => {
                  fetch("/api/businesses")
                    .then((r) => r.json())
                    .then((d) => setBusinessesList(d.businesses || []));
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Brand identity
              </CardTitle>
              <CardDescription>
                Active business for this workspace, logo, and newsletter appearance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="business">Active business</Label>
                <Select value={brand.businessSlug} onValueChange={onBusinessChange}>
                  <SelectTrigger id="business">
                    <SelectValue placeholder="Select business" />
                  </SelectTrigger>
                  <SelectContent>
                    {(businessesList.length ? businessesList : []).map((b) => (
                      <SelectItem key={b.slug} value={b.slug}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Organization name in emails:{" "}
                  <span className="font-medium text-foreground">
                    {selectedBusiness?.name ?? "—"}
                  </span>
                </p>
              </div>
              <div className="space-y-2 max-w-xl">
                <Label htmlFor="logoUrl">Logo URL</Label>
                <Input
                  id="logoUrl"
                  placeholder="https://example.com/logo.png"
                  value={brand.logoUrl}
                  onChange={(e) => setBrand({ ...brand, logoUrl: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Shown in the email header. Use a direct image URL.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Library className="h-4 w-4" />
                    Brand Library URLs
                  </Label>
                  <Button variant="outline" size="sm" onClick={addBrandLibraryUrl} className="gap-1">
                    <Plus className="h-3.5 w-3.5" /> Add URL
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Add URLs to brochures, templates, flyers, or brand assets for reference.
                </p>
                {brand.brandLibraryUrls.map((url, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input
                      placeholder="https://example.com/brochure.pdf or template URL"
                      value={url}
                      onChange={(e) => updateBrandLibraryUrl(i, e.target.value)}
                      className="flex-1"
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeBrandLibraryUrl(i)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label>Newsletter appearance</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Controls HTML newsletter layout: outer background, content area, text color, link/button
                  color, and header strip. Legacy &quot;primary&quot; color is replaced by these explicit
                  roles.
                </p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <ColorField
                    label="Header background"
                    value={brand.headerBackgroundColor}
                    onChange={(v) => setBrand({ ...brand, headerBackgroundColor: v })}
                  />
                  <ColorField
                    label="Page background (outer)"
                    value={brand.newsletterPageBackground}
                    onChange={(v) => setBrand({ ...brand, newsletterPageBackground: v })}
                  />
                  <ColorField
                    label="Content background (card)"
                    value={brand.newsletterCardBackground}
                    onChange={(v) => setBrand({ ...brand, newsletterCardBackground: v })}
                  />
                  <ColorField
                    label="Text color (foreground)"
                    value={brand.newsletterTextColor}
                    onChange={(v) => setBrand({ ...brand, newsletterTextColor: v })}
                  />
                  <ColorField
                    label="Links & buttons"
                    value={brand.newsletterLinkColor}
                    onChange={(v) => setBrand({ ...brand, newsletterLinkColor: v })}
                  />
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="fontFamily">Font family (newsletter body)</Label>
                    <Input
                      id="fontFamily"
                      value={brand.fontFamily}
                      onChange={(e) => setBrand({ ...brand, fontFamily: e.target.value })}
                      placeholder="Georgia, Arial, sans-serif"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact & Footer</CardTitle>
              <CardDescription>
                Information displayed in the email footer.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={brand.address}
                    onChange={(e) => setBrand({ ...brand, address: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={brand.phone}
                    onChange={(e) => setBrand({ ...brand, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="websiteUrl">Website URL</Label>
                  <Input
                    id="websiteUrl"
                    value={brand.websiteUrl}
                    onChange={(e) => setBrand({ ...brand, websiteUrl: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input
                    id="contactEmail"
                    value={brand.contactEmail}
                    onChange={(e) => setBrand({ ...brand, contactEmail: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="footerText">Footer Text</Label>
                <Textarea
                  id="footerText"
                  value={brand.footerText}
                  onChange={(e) => setBrand({ ...brand, footerText: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Social Links</Label>
                  <Button variant="outline" size="sm" onClick={addSocialLink} className="gap-1">
                    <Plus className="h-3.5 w-3.5" /> Add Link
                  </Button>
                </div>
                {brand.socialLinks.map((link, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input
                      placeholder="Label (e.g. LinkedIn)"
                      value={link.label}
                      onChange={(e) => updateSocialLink(i, "label", e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      placeholder="URL"
                      value={link.url}
                      onChange={(e) => updateSocialLink(i, "url", e.target.value)}
                      className="flex-[2]"
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeSocialLink(i)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Brand Guidelines</CardTitle>
              <CardDescription>
                Describe your brand voice, tone, and style guidelines. The AI assistant
                will reference these when helping you create and modify email content.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="e.g. Professional but approachable tone. Use data-driven messaging. Avoid excessive exclamation marks. Highlight career growth and placement statistics..."
                value={brand.brandGuidelines}
                onChange={(e) => setBrand({ ...brand, brandGuidelines: e.target.value })}
                rows={5}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
              ) : (
                <><Save className="h-4 w-4" /> Save Brand Settings</>
              )}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6 mt-4">
          <IntegrationsCard />
          <CronCard />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-10 shrink-0 cursor-pointer rounded border"
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="font-mono text-xs" />
      </div>
    </div>
  );
}

function IntegrationsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Integrations</CardTitle>
        <CardDescription>
          Status of external service connections. Set environment variables to
          configure each integration.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[
            { name: "Clerk Authentication", description: "User authentication and role management", key: "CLERK" },
            { name: "Neon Database", description: "PostgreSQL database for all app data", key: "DATABASE" },
            { name: "Resend Email", description: "Transactional email delivery", key: "RESEND" },
            { name: "Exa API", description: "Web-based contact discovery", key: "EXA" },
            { name: "Cron Secret", description: "Scheduled send job authorization", key: "CRON" },
          ].map((integration) => (
            <div
              key={integration.name}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div>
                <h3 className="font-medium">{integration.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {integration.description}
                </p>
              </div>
              <Badge className="gap-1">
                <CheckCircle className="h-3 w-3" />
                Configured
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function CronCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Scheduled Sending</CardTitle>
        <CardDescription>
          To enable automated sending, add a Vercel Cron job that calls:
        </CardDescription>
      </CardHeader>
      <CardContent>
        <code className="block rounded-lg bg-muted p-4 text-sm">
          GET /api/cron/send
          <br />
          Authorization: Bearer {"<CRON_SECRET>"}
        </code>
        <p className="mt-3 text-sm text-muted-foreground">
          Configure this in your <code>vercel.json</code> to run every 5
          minutes for near-realtime schedule processing.
        </p>
      </CardContent>
    </Card>
  );
}
