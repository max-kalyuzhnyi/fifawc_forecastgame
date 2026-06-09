-- Enable realtime for live match updates and predictions
alter publication supabase_realtime add table matches;
alter publication supabase_realtime add table predictions;
alter publication supabase_realtime add table match_scorers;
