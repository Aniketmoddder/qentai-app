
'use client';

import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { addAnimeToFirestore, getAllAnimes, updateAnimeInFirestore } from '@/services/animeService';
import type { Anime, Episode, Season } from '@/types/anime'; // Assuming Season type exists
import { Loader2, PlusCircle, Trash2, Save } from 'lucide-react';

const episodeSchema = z.object({
  id: z.string().optional(), // Optional for new episodes
  title: z.string().min(1, 'Episode title is required'),
  episodeNumber: z.number().min(1, 'Episode number must be at least 1'),
  seasonNumber: z.number().min(1, 'Season number must be at least 1'),
  thumbnail: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  duration: z.string().optional(),
  url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  airDate: z.string().optional(),
  overview: z.string().optional(),
});

const animeSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  coverImage: z.string().url('Cover image URL is required'),
  bannerImage: z.string().url('Banner image URL is optional').optional().or(z.literal('')),
  year: z.coerce.number().min(1900, 'Year must be valid').max(new Date().getFullYear() + 5, 'Year seems too far in future'),
  genre: z.array(z.string()).min(1, 'At least one genre is required'),
  status: z.enum(['Ongoing', 'Completed', 'Upcoming', 'Unknown']),
  synopsis: z.string().min(10, 'Synopsis must be at least 10 characters'),
  type: z.enum(['TV', 'Movie', 'OVA', 'Special', 'Unknown']),
  sourceAdmin: z.literal('manual').default('manual'),
  episodes: z.array(episodeSchema).optional(), // Only relevant for TV shows initially
});

type AnimeFormData = z.infer<typeof animeSchema>;

export default function ManualAddTab() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [availableGenres] = useState(['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Sci-Fi', 'Slice of Life', 'Romance', 'Horror', 'Mystery', 'Thriller', 'Sports', 'Supernatural', 'Mecha', 'Historical', 'Music', 'School', 'Shounen', 'Shoujo', 'Seinen', 'Josei', 'Isekai', 'Psychological']);
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
      sourceAdmin: 'manual',
      episodes: [],
    },
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "episodes"
  });

  const watchType = form.watch("type");

  const handleGenreChange = (genre: string) => {
    const newSelectedGenres = selectedGenres.includes(genre)
      ? selectedGenres.filter(g => g !== genre)
      : [...selectedGenres, genre];
    setSelectedGenres(newSelectedGenres);
    form.setValue('genre', newSelectedGenres);
  };
  
  const onSubmit = async (data: AnimeFormData) => {
    setIsLoading(true);
    try {
      // Ensure episodes are correctly structured for Firestore, especially if it's a Movie type
      const animeData: Omit<Anime, 'id'> = {
        ...data,
        episodes: data.type === 'Movie' 
          ? [{ 
              id: `${data.title.replace(/\s+/g, '-')}-movie-ep`, 
              title: "Full Movie", 
              episodeNumber: 1, 
              seasonNumber: 1, 
              url: data.episodes?.[0]?.url || '', // Take URL from first episode field if provided for movie
            }] 
          : (data.episodes || []).map((ep, index) => ({
              ...ep,
              id: ep.id || `${data.title.replace(/\s+/g, '-')}-s${ep.seasonNumber}e${ep.episodeNumber}-${index}` // Ensure ID
            })),
      };

      const newAnimeId = await addAnimeToFirestore(animeData);
      toast({ title: 'Content Added', description: `${data.title} has been successfully added with ID: ${newAnimeId}.` });
      form.reset();
      setSelectedGenres([]);
    } catch (err) {
      console.error('Failed to add content:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      toast({ variant: 'destructive', title: 'Save Error', description: `Failed to add content: ${errorMessage}` });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manually Add Content</CardTitle>
        <CardDescription>Add new Anime, Movies, OVAs, or Specials directly to the database.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormFieldItem name="title" label="Title" placeholder="e.g., Grand Adventure Series" form={form} />
            <FormFieldItem name="year" label="Year" type="number" placeholder="e.g., 2023" form={form} />
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

          {/* Genres */}
          <div>
            <Label>Genres (Select multiple)</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-1 p-2 border rounded-md max-h-40 overflow-y-auto">
              {availableGenres.map(genre => (
                <Button
                  key={genre}
                  type="button"
                  variant={selectedGenres.includes(genre) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleGenreChange(genre)}
                  className="text-xs"
                >
                  {genre}
                </Button>
              ))}
            </div>
            {form.formState.errors.genre && <p className="text-sm text-destructive mt-1">{form.formState.errors.genre.message}</p>}
          </div>

          {/* Episodes (Only for TV type for now, could be expanded) */}
          {watchType === 'TV' && (
            <Card className="p-4">
              <CardHeader className="p-0 pb-3">
                <CardTitle className="text-lg">Episodes</CardTitle>
              </CardHeader>
              <CardContent className="p-0 space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="p-3 border rounded-md bg-card/50 space-y-2">
                    <div className="flex justify-between items-center">
                       <p className="font-medium text-sm">Episode {index + 1}</p>
                       <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive hover:bg-destructive/10 h-7 w-7">
                         <Trash2 className="h-4 w-4" />
                       </Button>
                    </div>
                    <FormFieldItem name={`episodes.${index}.title`} label="Episode Title" placeholder="e.g., The Beginning" form={form} fieldIndex={index}/>
                    <div className="grid grid-cols-2 gap-2">
                        <FormFieldItem name={`episodes.${index}.episodeNumber`} label="Ep. Number" type="number" placeholder="1" form={form} fieldIndex={index} />
                        <FormFieldItem name={`episodes.${index}.seasonNumber`} label="Season No." type="number" placeholder="1" form={form} fieldIndex={index}/>
                    </div>
                    <FormFieldItem name={`episodes.${index}.url`} label="Video URL" placeholder="https://example.com/episode.mp4" form={form} fieldIndex={index}/>
                    <FormFieldItem name={`episodes.${index}.thumbnail`} label="Thumbnail URL (Optional)" placeholder="https://example.com/thumb.jpg" form={form} fieldIndex={index}/>
                    <FormFieldItem name={`episodes.${index}.duration`} label="Duration (Optional)" placeholder="e.g., 24min" form={form} fieldIndex={index}/>
                     <FormFieldItem name={`episodes.${index}.overview`} label="Episode Overview (Optional)" placeholder="Short summary of the episode" form={form} isTextarea fieldIndex={index}/>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => append({ title: '', episodeNumber: (fields.length + 1), seasonNumber: 1, url: '', thumbnail: '', duration: '', overview: ''})}
                  className="w-full"
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Episode
                </Button>
              </CardContent>
            </Card>
          )}
          
          {watchType === 'Movie' && (
             <Card className="p-4">
                <CardHeader className="p-0 pb-3">
                    <CardTitle className="text-lg">Movie Video URL</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <FormFieldItem name={`episodes.0.url`} label="Movie Video URL" placeholder="https://example.com/movie.mp4" form={form} />
                    <p className="text-xs text-muted-foreground mt-1">For movies, provide a single video URL here. It will be stored as the first episode.</p>
                </CardContent>
             </Card>
          )}


          <Button type="submit" disabled={isLoading} className="w-full btn-primary-gradient">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Add Content
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// Helper component for form fields to reduce repetition
interface FormFieldItemProps {
  name: any; // Adjust type as per useForm's Path<T>
  label: string;
  placeholder?: string;
  type?: string;
  form: ReturnType<typeof useForm<AnimeFormData>>;
  isTextarea?: boolean;
  fieldIndex?: number; // For field arrays
}

function FormFieldItem({ name, label, placeholder, type = "text", form, isTextarea = false, fieldIndex }: FormFieldItemProps) {
  const { register, formState: { errors } } = form;
  const error = fieldIndex !== undefined && errors.episodes?.[fieldIndex]?.[name.split('.').pop()] ? errors.episodes[fieldIndex][name.split('.').pop()] : errors[name as keyof AnimeFormData];

  return (
    <div className="space-y-1">
      <Label htmlFor={name}>{label}</Label>
      {isTextarea ? (
        <Textarea id={name} placeholder={placeholder} {...register(name)} className="bg-input" />
      ) : (
        <Input id={name} type={type} placeholder={placeholder} {...register(name, type === 'number' ? { valueAsNumber: true } : {})} className="bg-input" />
      )}
      {error && <p className="text-sm text-destructive">{error.message}</p>}
    </div>
  );
}

// Helper component for select fields
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
      <Label htmlFor={name}>{label}</Label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Select onValueChange={field.onChange} value={field.value}>
            <SelectTrigger id={name} className="bg-input">
              <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {items.map(item => (
                <SelectItem key={item} value={item}>{item}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      {error && <p className="text-sm text-destructive">{error.message}</p>}
    </div>
  );
}
