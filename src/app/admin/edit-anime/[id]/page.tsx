
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getAnimeById, updateAnimeInFirestore, getAllAnimes } from '@/services/animeService'; // getAllAnimes to fetch existing genres
import type { Anime, Episode } from '@/types/anime';
import { Loader2, Save, PlusCircle, Trash2, ArrowLeft, AlertCircle } from 'lucide-react';
import Container from '@/components/layout/container';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';

const episodeSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Episode title is required'),
  episodeNumber: z.coerce.number().min(0, 'Episode number must be 0 or positive'),
  seasonNumber: z.coerce.number().min(0, 'Season number must be 0 or positive'),
  thumbnail: z.string().url('Must be a valid URL for thumbnail').optional().or(z.literal('')),
  duration: z.string().optional(),
  url: z.string().url('Must be a valid URL for video').optional().or(z.literal('')),
  airDate: z.string().optional(),
  overview: z.string().optional(),
});

const animeSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  coverImage: z.string().url('Cover image URL is required'),
  bannerImage: z.string().url('Banner image URL is optional').optional().or(z.literal('')),
  year: z.coerce.number().min(1900, 'Year must be valid').max(new Date().getFullYear() + 10, 'Year seems too far in future'),
  genre: z.array(z.string()).min(1, 'At least one genre is required'),
  status: z.enum(['Ongoing', 'Completed', 'Upcoming', 'Unknown']),
  synopsis: z.string().min(10, 'Synopsis must be at least 10 characters'),
  type: z.enum(['TV', 'Movie', 'OVA', 'Special', 'Unknown']),
  isFeatured: z.boolean().optional(),
  episodes: z.array(episodeSchema).optional(),
});

type AnimeFormData = z.infer<typeof animeSchema>;

const ADMIN_EMAIL = 'ninjax.desi@gmail.com';

export default function EditAnimePage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const animeId = params.id as string;

  const { user, loading: authLoading } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  const [availableGenres, setAvailableGenres] = useState<string[]>(['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Sci-Fi', 'Slice of Life', 'Romance', 'Horror', 'Mystery', 'Thriller', 'Sports', 'Supernatural', 'Mecha', 'Historical', 'Music', 'School', 'Shounen', 'Shoujo', 'Seinen', 'Josei', 'Isekai', 'Psychological', 'Ecchi', 'Harem', 'Demons', 'Magic', 'Martial Arts', 'Military', 'Parody', 'Police', 'Samurai', 'Space', 'Super Power', 'Vampire', 'Game']);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);


  const form = useForm<AnimeFormData>({
    resolver: zodResolver(animeSchema),
    defaultValues: {
      title: '',
      coverImage: '',
      bannerImage: '',
      year: new Date().getFullYear(),
      genre: [],
      status: 'Unknown',
      synopsis: '',
      type: 'TV',
      isFeatured: false,
      episodes: [],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "episodes"
  });

  const watchType = form.watch("type");

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login?redirect=/admin');
        setIsAuthorized(false);
      } else if (user.email !== ADMIN_EMAIL) {
        toast({ variant: 'destructive', title: 'Unauthorized', description: 'You do not have permission to access this page.' });
        router.push('/');
        setIsAuthorized(false);
      } else {
        setIsAuthorized(true);
      }
    }
  }, [user, authLoading, router, toast]);
  
  const fetchAnimeData = useCallback(async () => {
    if (!animeId) {
      setFetchError("Anime ID is missing.");
      setIsPageLoading(false);
      return;
    }
    setIsPageLoading(true);
    setFetchError(null);
    try {
      const animeData = await getAnimeById(animeId);
      if (animeData) {
        form.reset({
          ...animeData,
          isFeatured: animeData.isFeatured || false,
          episodes: animeData.episodes?.map(ep => ({...ep})) || [], // Ensure episodes are new objects
        });
        setSelectedGenres(animeData.genre || []);
      } else {
        setFetchError('Anime not found.');
        toast({ variant: 'destructive', title: 'Error', description: 'Anime with this ID was not found.' });
      }
    } catch (err) {
      console.error('Failed to fetch anime data:', err);
      setFetchError('Failed to load anime data. Please try again.');
      toast({ variant: 'destructive', title: 'Fetch Error', description: 'Could not load anime data for editing.' });
    } finally {
      setIsPageLoading(false);
    }
  }, [animeId, form, toast]);


  useEffect(() => {
    if (isAuthorized) {
        fetchAnimeData();
    }
  }, [isAuthorized, fetchAnimeData]);

  // Fetch all unique genres from DB to populate genre selector
  useEffect(() => {
    const fetchAllUniqueGenres = async () => {
        try {
            const animes = await getAllAnimes({limit: 500}); // Fetch a large number to get most genres
            const uniqueGenres = new Set<string>(availableGenres); // Start with predefined
            animes.forEach(anime => anime.genre.forEach(g => uniqueGenres.add(g)));
            setAvailableGenres(Array.from(uniqueGenres).sort());
        } catch (error) {
            console.warn("Could not fetch all unique genres for selector, using predefined list.", error);
        }
    };
    if (isAuthorized) {
        fetchAllUniqueGenres();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthorized]);


  const handleGenreChange = (genre: string) => {
    const newSelectedGenres = selectedGenres.includes(genre)
      ? selectedGenres.filter(g => g !== genre)
      : [...selectedGenres, genre];
    setSelectedGenres(newSelectedGenres);
    form.setValue('genre', newSelectedGenres, { shouldValidate: true });
  };

  const onSubmit = async (data: AnimeFormData) => {
    setIsSubmitting(true);
    try {
      const updateData: Partial<Anime> = {
        ...data,
        episodes: (data.episodes || []).map((ep, index) => ({
          ...ep,
          id: ep.id || `${data.title.replace(/\s+/g, '-')}-s${ep.seasonNumber}e${ep.episodeNumber}-${index}-${Date.now()}`.toLowerCase()
        })),
      };
      await updateAnimeInFirestore(animeId, updateData);
      toast({ title: 'Content Updated', description: `${data.title} has been successfully updated.` });
      router.push('/admin?tab=content-management'); 
    } catch (err) {
      console.error('Failed to update content:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      toast({ variant: 'destructive', title: 'Update Error', description: `Failed to update content: ${errorMessage}` });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  useEffect(() => {
    if (watchType === 'Movie') {
        if (!fields.length || fields[0].title !== "Full Movie") {
            replace([{ 
                id: `${form.getValues('title') || 'movie'}-${Date.now()}`.replace(/\s+/g, '-').toLowerCase(),
                title: "Full Movie", 
                episodeNumber: 1, 
                seasonNumber: 1, 
                url: fields[0]?.url || '', 
                thumbnail: fields[0]?.thumbnail || '', 
                duration: fields[0]?.duration || '', 
                overview: fields[0]?.overview || '' 
            }]);
        }
    } else {
        // If switching from movie to TV, and there's a "Full Movie" placeholder, clear it.
        // Only clear if user intentionally changes type from movie and it had the placeholder.
        // This condition can be tricky to avoid data loss if user accidentally switches back and forth.
        // For now, if it's not a Movie, we don't enforce the single episode.
        // The `ManualAddTab` behavior of clearing all non-movie episodes when switching to movie is aggressive.
        // Let's be more conservative: if it's TV, allow multiple. If it becomes Movie, enforce one.
    }
  }, [watchType, replace, form, fields]);


  if (authLoading || isAuthorized === null) {
    return (
      <Container className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-16 h-16 animate-spin text-primary" />
      </Container>
    );
  }

  if (!isAuthorized && !authLoading) {
     return (
      <Container className="py-12 text-center">
        <AlertCircle className="mx-auto h-16 w-16 text-destructive mb-4" />
        <h1 className="text-3xl font-bold text-destructive">Access Denied</h1>
        <p className="text-muted-foreground text-lg">You do not have permission to view this page.</p>
        <Button asChild variant="link" className="mt-6 text-lg">
          <Link href="/">Go to Homepage</Link>
        </Button>
      </Container>
    );
  }

  if (isPageLoading) {
    return (
      <Container className="py-12 text-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading anime data...</p>
      </Container>
    );
  }

  if (fetchError) {
    return (
      <Container className="py-12 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-bold text-destructive">Error Loading Data</h1>
        <p className="text-muted-foreground">{fetchError}</p>
        <Button asChild variant="link" className="mt-4" onClick={() => router.back()}>
            Go Back
        </Button>
      </Container>
    );
  }

  return (
    <Container className="py-8 md:py-12">
      <Button variant="outline" onClick={() => router.push('/admin?tab=content-management')} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Content Management
      </Button>
      <Card className="shadow-xl border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-semibold text-primary">Edit: {form.getValues('title') || 'Content'}</CardTitle>
          <CardDescription>Modify the details for this anime/movie.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormFieldItem name="title" label="Title" placeholder="e.g., Grand Adventure Series" form={form} />
              <FormFieldItem name="year" label="Release Year" type="number" placeholder="e.g., 2023" form={form} />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormFieldItem name="coverImage" label="Cover Image URL" placeholder="https://example.com/cover.jpg" form={form} />
              <FormFieldItem name="bannerImage" label="Banner Image URL (Optional)" placeholder="https://example.com/banner.jpg" form={form} />
            </div>

            <FormFieldItem name="synopsis" label="Synopsis" placeholder="A brief summary of the content..." form={form} isTextarea />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormSelectItem name="type" label="Type" items={['TV', 'Movie', 'OVA', 'Special', 'Unknown']} form={form} />
              <FormSelectItem name="status" label="Status" items={['Ongoing', 'Completed', 'Upcoming', 'Unknown']} form={form} />
            </div>
            
            <div>
                <Label htmlFor="isFeatured" className="font-medium flex items-center">
                <Controller
                    name="isFeatured"
                    control={form.control}
                    render={({ field }) => (
                    <Input
                        type="checkbox"
                        id="isFeatured"
                        checked={field.value || false}
                        onCheckedChange={field.onChange}
                        className="mr-2 h-4 w-4 accent-primary"
                    />
                    )}
                />
                Featured Anime
                </Label>
                {form.formState.errors.isFeatured && <p className="text-sm text-destructive mt-1">{form.formState.errors.isFeatured.message}</p>}
            </div>


            <div>
              <Label className="font-medium">Genres (Select multiple)</Label>
              <ScrollArea className="h-32 md:h-40 mt-1 p-2 border rounded-md bg-input/30">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {availableGenres.map(genre => (
                    <Button
                      key={genre}
                      type="button"
                      variant={selectedGenres.includes(genre) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleGenreChange(genre)}
                      className="text-xs h-8 justify-start"
                    >
                      {genre}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
              {form.formState.errors.genre && <p className="text-sm text-destructive mt-1">{form.formState.errors.genre.message}</p>}
            </div>
            
            {watchType === 'Movie' ? (
                <Card className="p-4 bg-card/60 border-border/30">
                    <CardHeader className="p-0 pb-3">
                        <CardTitle className="text-lg font-medium">Movie Details</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 space-y-3">
                        <FormFieldItem name={`episodes.0.url`} label="Movie Video URL" placeholder="https://example.com/movie.mp4" form={form} fieldIndex={0} />
                        <FormFieldItem name={`episodes.0.thumbnail`} label="Movie Thumbnail URL (Optional)" placeholder="https://example.com/movie_thumb.jpg" form={form} fieldIndex={0} />
                        <FormFieldItem name={`episodes.0.duration`} label="Movie Duration (e.g., 1h 30min)" placeholder="e.g., 1h 30min" form={form} fieldIndex={0} />
                        <p className="text-xs text-muted-foreground mt-1">For movies, provide a single video URL and optional details here.</p>
                    </CardContent>
                </Card>
            ): (
              <Card className="p-4 bg-card/60 border-border/30">
                <CardHeader className="p-0 pb-3 flex flex-row justify-between items-center">
                  <CardTitle className="text-lg font-medium">Episodes</CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ title: '', episodeNumber: (fields.length + 1), seasonNumber: 1, url: '', thumbnail: '', duration: '', overview: ''})}
                    className="text-xs"
                  >
                    <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Add Episode
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  {fields.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No episodes added yet for this TV series/OVA/Special.</p>}
                  <ScrollArea className={fields.length > 0 ? "max-h-[400px] space-y-3 pr-2 -mr-2" : "space-y-3"}>
                      {fields.map((field, index) => (
                      <div key={field.id} className="p-3 border rounded-md bg-card/50 space-y-2.5 relative mt-2 first:mt-0">
                          <div className="flex justify-between items-center mb-1">
                          <p className="font-medium text-sm text-primary">Episode {index + 1} (Season {form.watch(`episodes.${index}.seasonNumber`) || 1}, Ep No. {form.watch(`episodes.${index}.episodeNumber`) || (index + 1)})</p>
                          <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive hover:bg-destructive/10 h-7 w-7 absolute top-1 right-1">
                              <Trash2 className="h-4 w-4" />
                          </Button>
                          </div>
                          <FormFieldItem name={`episodes.${index}.title`} label="Episode Title" placeholder="e.g., The Adventure Begins" form={form} fieldIndex={index}/>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              <FormFieldItem name={`episodes.${index}.episodeNumber`} label="Episode No." type="number" placeholder="1" form={form} fieldIndex={index} />
                              <FormFieldItem name={`episodes.${index}.seasonNumber`} label="Season No." type="number" placeholder="1" form={form} fieldIndex={index}/>
                          </div>
                          <FormFieldItem name={`episodes.${index}.url`} label="Video URL" placeholder="https://example.com/episode.mp4" form={form} fieldIndex={index}/>
                          <FormFieldItem name={`episodes.${index}.thumbnail`} label="Thumbnail URL (Optional)" placeholder="https://example.com/thumb.jpg" form={form} fieldIndex={index}/>
                          <FormFieldItem name={`episodes.${index}.duration`} label="Duration (Optional)" placeholder="e.g., 24min" form={form} fieldIndex={index}/>
                          <FormFieldItem name={`episodes.${index}.overview`} label="Episode Overview (Optional)" placeholder="Short summary of the episode" form={form} isTextarea fieldIndex={index}/>
                      </div>
                      ))}
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            <Button type="submit" disabled={isSubmitting} className="w-full btn-primary-gradient text-base py-3">
              {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>
    </Container>
  );
}

interface FormFieldItemProps {
  name: any; 
  label: string;
  placeholder?: string;
  type?: string;
  form: ReturnType<typeof useForm<AnimeFormData>>;
  isTextarea?: boolean;
  fieldIndex?: number; 
}

function FormFieldItem({ name, label, placeholder, type = "text", form, isTextarea = false, fieldIndex }: FormFieldItemProps) {
  const { register, formState: { errors } } = form;
  
  let error;
  if (name.startsWith('episodes.')) {
      const parts = name.split('.');
      const episodeIndex = parseInt(parts[1]);
      const fieldName = parts[2];
      if (errors.episodes && Array.isArray(errors.episodes) && errors.episodes[episodeIndex] && errors.episodes[episodeIndex]![fieldName as keyof Episode]) {
          error = errors.episodes[episodeIndex]![fieldName as keyof Episode];
      }
  } else {
      error = errors[name as keyof AnimeFormData];
  }

  const inputId = fieldIndex !== undefined ? `episodes.${fieldIndex}.${name.split('.').pop()}` : name;


  return (
    <div className="space-y-1">
      <Label htmlFor={inputId} className="text-xs font-medium">{label}</Label>
      {isTextarea ? (
        <Textarea id={inputId} placeholder={placeholder} {...register(name)} className="bg-input border-border/70 focus:border-primary text-sm" rows={3} />
      ) : (
        <Input id={inputId} type={type} placeholder={placeholder} {...register(name, type === 'number' ? { valueAsNumber: true } : {})} className="bg-input border-border/70 focus:border-primary h-9 text-sm" />
      )}
      {error && <p className="text-xs text-destructive mt-0.5">{(error as any).message}</p>}
    </div>
  );
}

interface FormSelectItemProps {
  name: any;
  label: string;
  items: string[];
  form: ReturnType<typeof useForm<AnimeFormData>>;
}

function FormSelectItem({ name, label, items, form }: FormSelectItemProps) {
  const { control, formState: { errors } } = form;
  const error = errors[name as keyof AnimeFormData];

  return (
    <div className="space-y-1">
      <Label htmlFor={name} className="font-medium">{label}</Label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Select onValueChange={field.onChange} value={field.value?.toString()} defaultValue={field.value?.toString()}>
            <SelectTrigger id={name} className="bg-input border-border/70 focus:border-primary h-10 text-sm">
              <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {items.map(item => (
                <SelectItem key={item} value={item} className="text-sm">{item}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      {error && <p className="text-sm text-destructive mt-1">{(error as any).message}</p>}
    </div>
  );
}


    
