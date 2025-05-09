
'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { getAllAnimes, deleteAnimeFromFirestore } from '@/services/animeService';
import type { Anime } from '@/types/anime';
import { Button } from '@/components/ui/button';
import { Loader2, Edit, Trash2, Search, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function ContentManagementTab() {
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchAnimes = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedAnimes = await getAllAnimes(100); // Fetch more for filtering
      setAnimes(fetchedAnimes);
    } catch (err) {
      console.error('Failed to fetch anime list:', err);
      setError('Failed to load anime content. Please try again.');
      toast({ variant: 'destructive', title: 'Fetch Error', description: 'Could not load anime list.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnimes();
  }, [toast]); // Removed toast from dependencies as it shouldn't trigger refetch

  const handleDelete = async (animeId: string, animeTitle: string) => {
    try {
      await deleteAnimeFromFirestore(animeId);
      toast({ title: 'Anime Deleted', description: `${animeTitle} has been successfully deleted.` });
      setAnimes(prevAnimes => prevAnimes.filter(anime => anime.id !== animeId));
    } catch (err) {
      console.error('Failed to delete anime:', err);
      toast({ variant: 'destructive', title: 'Delete Error', description: `Could not delete ${animeTitle}.` });
    }
  };

  const filteredAnimes = animes.filter(anime =>
    anime.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Placeholder for edit functionality
  const handleEdit = (animeId: string) => {
    toast({ title: 'Edit Action', description: `Edit functionality for anime ID ${animeId} is not yet implemented.` });
    // Future: router.push(`/admin/edit-anime/${animeId}`); or open a modal
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Content Management</CardTitle>
        <CardDescription>View, edit, or delete existing anime and movies in the database.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 bg-input"
            />
          </div>
          <Button onClick={fetchAnimes} className="ml-auto" variant="outline" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Refresh List
          </Button>
        </div>

        {isLoading && <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
        
        {error && !isLoading && (
          <div className="text-center py-8 text-destructive">
            <AlertCircle className="mx-auto h-10 w-10 mb-2" />
            <p>{error}</p>
          </div>
        )}

        {!isLoading && !error && filteredAnimes.length === 0 && (
          <p className="text-center py-8 text-muted-foreground">
            {searchTerm ? `No anime found matching "${searchTerm}".` : 'No anime content found in the database.'}
          </p>
        )}

        {!isLoading && !error && filteredAnimes.length > 0 && (
          <div className="space-y-3">
            {filteredAnimes.map(anime => (
              <Card key={anime.id} className="flex flex-col sm:flex-row items-start sm:items-center p-3 gap-3 bg-card/60 hover:bg-card/90 transition-colors">
                <div className="flex-shrink-0 w-16 h-24 relative rounded overflow-hidden">
                  <Image 
                    src={anime.coverImage || `https://picsum.photos/seed/${anime.id}/100/150`} 
                    alt={anime.title} 
                    fill
                    sizes="64px" 
                    className="object-cover"
                    data-ai-hint="anime poster"
                     />
                </div>
                <div className="flex-grow">
                  <h4 className="font-semibold text-foreground">{anime.title} <span className="text-xs text-muted-foreground">({anime.year})</span></h4>
                  <p className="text-xs text-muted-foreground">{anime.type} - {anime.status}</p>
                  <p className="text-xs text-muted-foreground">Genres: {anime.genre.join(', ')}</p>
                </div>
                <div className="flex-shrink-0 flex flex-col sm:flex-row gap-2 mt-2 sm:mt-0">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(anime.id)} className="w-full sm:w-auto">
                    <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="w-full sm:w-auto">
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete &quot;{anime.title}&quot; and all its associated data.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(anime.id, anime.title)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
