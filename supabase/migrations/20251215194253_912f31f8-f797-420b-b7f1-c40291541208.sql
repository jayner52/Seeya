-- Add more trip type options
INSERT INTO public.trip_types (name, slug, icon, color, description) VALUES
('Road Trip', 'road-trip', 'Car', 'indigo', 'Hit the open road'),
('Wellness & Spa', 'wellness-spa', 'Sparkles', 'teal', 'Relaxation and self-care'),
('Festival', 'festival', 'Music', 'violet', 'Music and arts festivals'),
('Cultural', 'cultural', 'Building2', 'yellow', 'History and heritage exploration'),
('Budget Backpacking', 'budget-backpacking', 'Backpack', 'lime', 'Explore on a shoestring'),
('Luxury Escape', 'luxury-escape', 'Crown', 'gold', 'Premium experiences'),
('Solo Adventure', 'solo-adventure', 'User', 'emerald', 'Me time exploration'),
('Anniversary', 'anniversary', 'Heart', 'red', 'Celebrating love milestones')
ON CONFLICT (slug) DO NOTHING;