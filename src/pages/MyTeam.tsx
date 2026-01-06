import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Upload,
  Calendar,
  Trophy,
  Settings,
  Image as ImageIcon,
  Crown,
  ArrowLeft,
  AlertTriangle,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const MyTeam = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [team, setTeam] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [upcomingTrainings, setUpcomingTrainings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [pastTrainings, setPastTrainings] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("config");

  const [teamForm, setTeamForm] = useState({
    name: "",
    tag: "",
    logo_url: "",
    banner_url: "",
    bio: "",
    description: "",
    region: "BR",
    platform: "PC",
    primary_color: "#9146FF",
    secondary_color: "#1F2937",
    discord_url: "",
    twitter_url: "",
    instagram_url: "",
    is_recruiting: false,
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [memberForm, setMemberForm] = useState({
    player_name: "",
    game_id: "",
    discord: "",
    function: "RUSH" as "RUSH" | "SUPORTE" | "CAPITÃO",
  });

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchTeam();
    }
  }, [user]);

  useEffect(() => {
    if (team) {
      fetchMembers();
      fetchUpcomingTrainings();
      fetchPastTrainings();
    }
  }, [team]);

  const checkUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
      await fetchProfile(session.user.id);
    } else {
      navigate("/auth");
    }
  };

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    setProfile(data);
  };

  const fetchTeam = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      
      if (data) {
        setTeam(data);
        setTeamForm({
          name: data.name,
          tag: data.tag,
          logo_url: data.logo_url || "",
          banner_url: data.banner_url || "",
          bio: data.bio || "",
          description: data.description || "",
          region: data.region || "BR",
          platform: data.platform || "PC",
          primary_color: data.primary_color || "#9146FF",
          secondary_color: data.secondary_color || "#1F2937",
          discord_url: data.discord_url || "",
          twitter_url: data.twitter_url || "",
          instagram_url: data.instagram_url || "",
          is_recruiting: data.is_recruiting || false,
        });
      }
    } catch (error: any) {
      toast.error("Erro ao carregar equipe");
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    const { data } = await supabase
      .from("team_members")
      .select("*")
      .eq("team_id", team.id)
      .order("created_at", { ascending: true });

    setMembers(data || []);
  };

  const fetchUpcomingTrainings = async () => {
    const { data } = await supabase
      .from("training_registrations")
      .select(`
        *,
        trainings (*)
      `)
      .eq("team_id", team.id);

    const upcoming = data
      ?.filter((reg: any) => new Date(reg.trainings.datetime) > new Date())
      .sort((a: any, b: any) =>
        new Date(a.trainings.datetime).getTime() -
        new Date(b.trainings.datetime).getTime()
      );

    setUpcomingTrainings(upcoming || []);
  };

  const fetchPastTrainings = async () => {
    const { data } = await supabase
      .from("training_registrations")
      .select(`
        *,
        trainings (*)
      `)
      .eq("team_id", team.id);

    const past = data
      ?.filter((reg: any) => new Date(reg.trainings.datetime) <= new Date())
      .sort((a: any, b: any) =>
        new Date(b.trainings.datetime).getTime() -
        new Date(a.trainings.datetime).getTime()
      );

    setPastTrainings(past || []);
  };

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setUploading(true);

      if (logoFile && logoFile.size > 5 * 1024 * 1024) {
        toast.error("A logo deve ter no máximo 5MB");
        return;
      }
      if (bannerFile && bannerFile.size > 5 * 1024 * 1024) {
        toast.error("O banner deve ter no máximo 5MB");
        return;
      }

      let logoUrl = teamForm.logo_url;
      let bannerUrl = teamForm.banner_url;

      if (logoFile) {
        const fileName = `${user.id}/${Date.now()}_logo_${logoFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('team-logos')
          .upload(fileName, logoFile, { cacheControl: '3600', upsert: true });
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('team-logos')
          .getPublicUrl(fileName);
        
        logoUrl = publicUrl;
      }

      if (bannerFile) {
        const fileName = `${user.id}/${Date.now()}_banner_${bannerFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('team-banners')
          .upload(fileName, bannerFile, { cacheControl: '3600', upsert: true });
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('team-banners')
          .getPublicUrl(fileName);
        
        bannerUrl = publicUrl;
      }

      const teamData = {
        name: teamForm.name,
        tag: teamForm.tag,
        logo_url: logoUrl || null,
        banner_url: bannerUrl || null,
        bio: teamForm.bio || null,
        description: teamForm.description || null,
        region: teamForm.region,
        platform: teamForm.platform,
        primary_color: teamForm.primary_color,
        secondary_color: teamForm.secondary_color,
        discord_url: teamForm.discord_url || null,
        twitter_url: teamForm.twitter_url || null,
        instagram_url: teamForm.instagram_url || null,
        is_recruiting: teamForm.is_recruiting,
      };

      if (team) {
        const { error } = await supabase
          .from("teams")
          .update(teamData)
          .eq("id", team.id);

        if (error) throw error;
        toast.success("Equipe atualizada!");
      } else {
        const { data, error } = await supabase
          .from("teams")
          .insert({
            ...teamData,
            owner_id: user.id,
          })
          .select()
          .single();

        if (error) throw error;
        setTeam(data);
        toast.success("Equipe criada!");
      }

      setDialogOpen(false);
      setLogoFile(null);
      setBannerFile(null);
      fetchTeam();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar equipe");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingMember) {
        const { error } = await supabase
          .from("team_members")
          .update(memberForm)
          .eq("id", editingMember.id);

        if (error) throw error;
        toast.success("Membro atualizado!");
      } else {
        const { error } = await supabase.from("team_members").insert({
          ...memberForm,
          team_id: team.id,
        });

        if (error) throw error;
        toast.success("Membro adicionado!");
      }

      setMemberDialogOpen(false);
      setEditingMember(null);
      setMemberForm({
        player_name: "",
        game_id: "",
        discord: "",
        function: "RUSH",
      });
      fetchMembers();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar membro");
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!confirm("Deseja realmente remover este membro?")) return;

    try {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;
      toast.success("Membro removido!");
      fetchMembers();
    } catch (error: any) {
      toast.error("Erro ao remover membro");
    }
  };

  const openEditMember = (member: any) => {
    setEditingMember(member);
    setMemberForm({
      player_name: member.player_name,
      game_id: member.game_id,
      discord: member.discord,
      function: member.function,
    });
    setMemberDialogOpen(true);
  };

  const handleDeleteTeam = async () => {
    if (!confirm("Deseja realmente excluir sua equipe? Esta ação não pode ser desfeita e você será removido de todos os treinos!")) return;

    try {
      const { error } = await supabase
        .from("teams")
        .delete()
        .eq("id", team.id);

      if (error) throw error;
      toast.success("Equipe excluída!");
      setTeam(null);
      setMembers([]);
    } catch (error: any) {
      toast.error("Erro ao excluir equipe");
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-[50vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!team) {
    return (
      <MainLayout>
        <main className="container mx-auto px-4 py-8">
          <Card className="p-12 text-center backdrop-blur-sm bg-card/80 border-border max-w-md mx-auto">
            <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Você ainda não tem uma equipe</h2>
            <p className="text-muted-foreground mb-6">
              Crie sua equipe para participar dos treinos
            </p>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Equipe
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Criar Equipe</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSaveTeam} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Nome da Equipe</Label>
                      <Input
                        id="name"
                        value={teamForm.name}
                        onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="tag">Tag</Label>
                      <Input
                        id="tag"
                        value={teamForm.tag}
                        onChange={(e) => setTeamForm({ ...teamForm, tag: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="logo">Logo da Equipe</Label>
                    <Input
                      id="logo"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                    />
                  </div>
                  <Button type="submit" className="w-full bg-primary" disabled={uploading}>
                    {uploading ? "Criando..." : "Criar Equipe"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </Card>
        </main>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-2xl font-black uppercase">GERENCIAR {team.name}</h1>
              <p className="text-sm text-muted-foreground">Administre seu time, membros e convites</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-5 bg-card/50">
            <TabsTrigger value="config" className="flex items-center gap-1 text-xs">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Configurações</span>
            </TabsTrigger>
            <TabsTrigger value="media" className="flex items-center gap-1 text-xs">
              <ImageIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Mídia</span>
            </TabsTrigger>
            <TabsTrigger value="members" className="flex items-center gap-1 text-xs">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Membros ({members.length})</span>
            </TabsTrigger>
            <TabsTrigger value="scrims" className="flex items-center gap-1 text-xs">
              <Trophy className="w-4 h-4" />
              <span className="hidden sm:inline">Scrims</span>
            </TabsTrigger>
            <TabsTrigger value="danger" className="flex items-center gap-1 text-xs text-destructive">
              <AlertTriangle className="w-4 h-4" />
              <span className="hidden sm:inline">Zona de Perigo</span>
            </TabsTrigger>
          </TabsList>

          {/* Config Tab */}
          <TabsContent value="config">
            <Card className="p-6 bg-card/50 border-border">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="w-5 h-5 text-primary" />
                <h2 className="font-bold uppercase">INFORMAÇÕES BÁSICAS</h2>
              </div>

              <form onSubmit={handleSaveTeam} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nome do Time</Label>
                    <Input
                      id="name"
                      value={teamForm.name}
                      onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="tag">Tag</Label>
                    <Input
                      id="tag"
                      value={teamForm.tag}
                      onChange={(e) => setTeamForm({ ...teamForm, tag: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="bio">Bio (frase curta)</Label>
                  <Input
                    id="bio"
                    placeholder="Uma frase que represente seu time"
                    value={teamForm.bio}
                    onChange={(e) => setTeamForm({ ...teamForm, bio: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    rows={4}
                    value={teamForm.description}
                    onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="region">Região</Label>
                    <Select
                      value={teamForm.region}
                      onValueChange={(value) => setTeamForm({ ...teamForm, region: value })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BR">Brasil</SelectItem>
                        <SelectItem value="NA">América do Norte</SelectItem>
                        <SelectItem value="EU">Europa</SelectItem>
                        <SelectItem value="LATAM">América Latina</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="platform">Plataforma</Label>
                    <Select
                      value={teamForm.platform}
                      onValueChange={(value) => setTeamForm({ ...teamForm, platform: value })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PC">PC</SelectItem>
                        <SelectItem value="Mobile">Mobile</SelectItem>
                        <SelectItem value="Misto">Misto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator className="my-6" />

                <div className="flex items-center gap-2 mb-4">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: teamForm.primary_color }} />
                  <h3 className="font-bold uppercase">CORES DO TIME</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">Defina as cores para personalizar seu time</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="primary_color">Cor Primária</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        id="primary_color"
                        value={teamForm.primary_color}
                        onChange={(e) => setTeamForm({ ...teamForm, primary_color: e.target.value })}
                        className="w-12 h-10 rounded border border-border cursor-pointer"
                      />
                      <Input
                        value={teamForm.primary_color}
                        onChange={(e) => setTeamForm({ ...teamForm, primary_color: e.target.value })}
                        placeholder="#DC2626"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="secondary_color">Cor Secundária</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        id="secondary_color"
                        value={teamForm.secondary_color}
                        onChange={(e) => setTeamForm({ ...teamForm, secondary_color: e.target.value })}
                        className="w-12 h-10 rounded border border-border cursor-pointer"
                      />
                      <Input
                        value={teamForm.secondary_color}
                        onChange={(e) => setTeamForm({ ...teamForm, secondary_color: e.target.value })}
                        placeholder="#1F2937"
                      />
                    </div>
                  </div>
                </div>

                {/* Color Preview */}
                <div>
                  <Label>Preview</Label>
                  <div
                    className="h-12 rounded-lg mt-2"
                    style={{ background: `linear-gradient(135deg, ${teamForm.primary_color}, ${teamForm.secondary_color})` }}
                  />
                </div>

                <Separator className="my-6" />

                <div className="flex items-center gap-2 mb-4">
                  <h3 className="font-bold uppercase">REDES SOCIAIS</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="discord_url">Discord Invite URL</Label>
                    <Input
                      id="discord_url"
                      placeholder="https://discord.gg/..."
                      value={teamForm.discord_url}
                      onChange={(e) => setTeamForm({ ...teamForm, discord_url: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="twitter_url">Twitter URL</Label>
                    <Input
                      id="twitter_url"
                      placeholder="https://twitter.com/..."
                      value={teamForm.twitter_url}
                      onChange={(e) => setTeamForm({ ...teamForm, twitter_url: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="instagram_url">Instagram URL</Label>
                    <Input
                      id="instagram_url"
                      placeholder="https://instagram.com/..."
                      value={teamForm.instagram_url}
                      onChange={(e) => setTeamForm({ ...teamForm, instagram_url: e.target.value })}
                    />
                  </div>
                </div>

                <Separator className="my-6" />

                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <h4 className="font-semibold">Recrutando jogadores</h4>
                    <p className="text-sm text-muted-foreground">Permite que jogadores enviem candidaturas</p>
                  </div>
                  <Switch
                    checked={teamForm.is_recruiting}
                    onCheckedChange={(checked) => setTeamForm({ ...teamForm, is_recruiting: checked })}
                  />
                </div>

                <Button type="submit" className="w-full bg-primary" disabled={uploading}>
                  {uploading ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </form>
            </Card>
          </TabsContent>

          {/* Media Tab */}
          <TabsContent value="media">
            <Card className="p-6 bg-card/50 border-border">
              <div className="flex items-center gap-2 mb-4">
                <ImageIcon className="w-5 h-5 text-primary" />
                <h2 className="font-bold uppercase">MÍDIA DO TIME</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-6">Upload de logo e banner com preview e ajuste de corte</p>

              <div className="space-y-8">
                {/* Logo Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold uppercase">LOGO DO TIME</h3>
                      <p className="text-sm text-muted-foreground">PNG, JPG ou WEBP (máx 5MB)</p>
                    </div>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                      />
                      <Button variant="outline" asChild>
                        <span>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Logo
                        </span>
                      </Button>
                    </label>
                  </div>

                  <div className="flex items-start gap-6">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Preview</p>
                      <div
                        className="w-20 h-20 rounded-xl flex items-center justify-center border-2"
                        style={{
                          borderColor: teamForm.primary_color,
                          background: `${teamForm.primary_color}20`,
                        }}
                      >
                        {teamForm.logo_url || logoFile ? (
                          <img
                            src={logoFile ? URL.createObjectURL(logoFile) : teamForm.logo_url}
                            alt="Logo"
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <span className="text-lg font-black" style={{ color: teamForm.primary_color }}>
                            {teamForm.tag?.substring(0, 2).toUpperCase() || "??"}
                          </span>
                        )}
                      </div>
                    </div>
                    <Card className="flex-1 p-4 bg-background/50">
                      <p className="text-sm text-muted-foreground">
                        ℹ️ Times Diamante, Mestre ou Elite podem usar GIF animado como logo.
                      </p>
                    </Card>
                  </div>
                </div>

                {/* Banner Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold uppercase">BANNER DO TIME</h3>
                      <p className="text-sm text-muted-foreground">PNG, JPG ou WEBP (recomendado 1920×480, máx 5MB)</p>
                    </div>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => setBannerFile(e.target.files?.[0] || null)}
                      />
                      <Button variant="outline" asChild>
                        <span>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Banner
                        </span>
                      </Button>
                    </label>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Preview do Banner</p>
                    <div
                      className="w-full h-24 rounded-lg overflow-hidden"
                      style={{
                        background: teamForm.banner_url || bannerFile
                          ? `url(${bannerFile ? URL.createObjectURL(bannerFile) : teamForm.banner_url}) center/cover`
                          : `linear-gradient(135deg, ${teamForm.primary_color}40, ${teamForm.secondary_color})`,
                      }}
                    />
                  </div>
                </div>

                {/* Card Preview */}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Preview do Card do Time</p>
                  <Card className="w-full max-w-xs overflow-hidden" style={{ borderTopColor: teamForm.primary_color, borderTopWidth: "3px" }}>
                    <div
                      className="h-16"
                      style={{
                        background: teamForm.banner_url || bannerFile
                          ? `url(${bannerFile ? URL.createObjectURL(bannerFile) : teamForm.banner_url}) center/cover`
                          : `linear-gradient(135deg, ${teamForm.primary_color}40, ${teamForm.secondary_color})`,
                      }}
                    >
                      <div className="relative top-8 left-4">
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center border-2 bg-card"
                          style={{ borderColor: teamForm.primary_color }}
                        >
                          {teamForm.logo_url || logoFile ? (
                            <img
                              src={logoFile ? URL.createObjectURL(logoFile) : teamForm.logo_url}
                              alt="Logo"
                              className="w-full h-full object-cover rounded-md"
                            />
                          ) : (
                            <span className="text-sm font-black" style={{ color: teamForm.primary_color }}>
                              {teamForm.tag?.substring(0, 2).toUpperCase() || "??"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="pt-8 pb-4 px-4">
                      <h4 className="font-bold">{teamForm.name || "Nome do Time"}</h4>
                      <p className="text-sm text-muted-foreground">[{teamForm.tag || "TAG"}]</p>
                    </div>
                  </Card>
                </div>

                <Button onClick={handleSaveTeam} className="w-full bg-primary" disabled={uploading}>
                  {uploading ? "Salvando..." : "Salvar Mídia"}
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members">
            <Card className="p-6 bg-card/50 border-border">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  <h2 className="font-bold uppercase">MEMBROS ({members.length})</h2>
                </div>
                <Dialog
                  open={memberDialogOpen}
                  onOpenChange={(open) => {
                    setMemberDialogOpen(open);
                    if (!open) {
                      setEditingMember(null);
                      setMemberForm({ player_name: "", game_id: "", discord: "", function: "RUSH" });
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <Button className="bg-primary hover:bg-primary/90">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Convidar Jogador
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border">
                    <DialogHeader>
                      <DialogTitle>{editingMember ? "Editar Membro" : "Adicionar Membro"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSaveMember} className="space-y-4">
                      <div>
                        <Label htmlFor="player_name">Nome</Label>
                        <Input
                          id="player_name"
                          value={memberForm.player_name}
                          onChange={(e) => setMemberForm({ ...memberForm, player_name: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="game_id">ID do Jogo</Label>
                        <Input
                          id="game_id"
                          value={memberForm.game_id}
                          onChange={(e) => setMemberForm({ ...memberForm, game_id: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="discord">Discord</Label>
                        <Input
                          id="discord"
                          placeholder="@usuario"
                          value={memberForm.discord}
                          onChange={(e) => setMemberForm({ ...memberForm, discord: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="function">Função</Label>
                        <Select
                          value={memberForm.function}
                          onValueChange={(value: any) => setMemberForm({ ...memberForm, function: value })}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="RUSH">RUSH</SelectItem>
                            <SelectItem value="SUPORTE">SUPORTE</SelectItem>
                            <SelectItem value="CAPITÃO">CAPITÃO</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button type="submit" className="w-full bg-primary">
                        {editingMember ? "Salvar" : "Adicionar"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {members.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Nenhum membro adicionado ainda</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {members.map((member, index) => (
                    <Card
                      key={member.id}
                      className="p-4 bg-background/50 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
                          {member.player_name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{member.player_name}</span>
                            {index === 0 && <Crown className="w-4 h-4 text-yellow-500" />}
                          </div>
                          <p className="text-xs text-muted-foreground">{member.function}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => openEditMember(member)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteMember(member.id)}
                          className="hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Scrims Tab */}
          <TabsContent value="scrims">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6 bg-card/50 border-border">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Próximas Scrims
                </h3>
                {upcomingTrainings.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Nenhuma scrim agendada</p>
                ) : (
                  <div className="space-y-3">
                    {upcomingTrainings.map((reg: any) => (
                      <Card
                        key={reg.id}
                        className="p-4 bg-background/50 cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => navigate(`/training/${reg.trainings.id}`)}
                      >
                        <h4 className="font-semibold line-clamp-1">{reg.trainings.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(reg.trainings.datetime), "dd/MM 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </Card>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="p-6 bg-card/50 border-border">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-muted-foreground" />
                  Histórico
                </h3>
                {pastTrainings.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Nenhum histórico</p>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {pastTrainings.map((reg: any) => (
                      <Card
                        key={reg.id}
                        className="p-4 bg-background/50 cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => navigate(`/training/${reg.trainings.id}`)}
                      >
                        <h4 className="font-semibold line-clamp-1">{reg.trainings.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(reg.trainings.datetime), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </Card>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>

          {/* Danger Zone Tab */}
          <TabsContent value="danger">
            <Card className="p-6 bg-card/50 border-destructive/30">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                <h2 className="font-bold uppercase text-destructive">ZONA DE PERIGO</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-6">Ações irreversíveis para seu time</p>

              <Button variant="destructive" onClick={handleDeleteTeam}>
                <Trash2 className="w-4 h-4 mr-2" />
                Deletar Time
              </Button>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </MainLayout>
  );
};

export default MyTeam;
