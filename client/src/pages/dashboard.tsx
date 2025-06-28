import { useQuery } from "@tanstack/react-query";
import { 
  Award, 
  Shield, 
  Mountain, 
  Brain, 
  Clock, 
  CheckCircle, 
  Loader2,
  TrendingUp 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RecommendationCard } from "@/components/recommendation-card";
import { api } from "@/lib/api";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/stats"],
    queryFn: api.getStats,
  });

  const { data: recentRecommendations, isLoading: recsLoading } = useQuery({
    queryKey: ["/api/recommendations", "recent"],
    queryFn: () => api.getRecommendations(undefined, 3),
  });

  const { data: recentAnalyses, isLoading: analysesLoading } = useQuery({
    queryKey: ["/api/analyses"],
    queryFn: () => api.getAnalyses(),
  });

  const StatCard = ({ title, value, icon: Icon, color }: any) => (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Icon className={`h-6 w-6 ${color}`} />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-muted-foreground truncate">
                {title}
              </dt>
              <dd className="text-lg font-medium text-foreground">
                {statsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : value}
              </dd>
            </dl>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">
          Engineering Recommendations Dashboard
        </h1>
        <p className="mt-2 text-muted-foreground">
          Comprehensive stormwater management guidance and best practices
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="QSD Guidelines"
          value={stats?.qsdCount || 0}
          icon={Award}
          color="text-primary"
        />
        <StatCard
          title="SWPPP Practices"
          value={stats?.swpppCount || 0}
          icon={Shield}
          color="text-accent"
        />
        <StatCard
          title="Erosion Controls"
          value={stats?.erosionCount || 0}
          icon={Mountain}
          color="text-warning"
        />
        <StatCard
          title="AI Insights"
          value={stats?.analysisCount || 0}
          icon={Brain}
          color="text-purple-600"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Recent Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : recentRecommendations?.length > 0 ? (
              <div className="space-y-4">
                {recentRecommendations.slice(0, 3).map((rec: any) => (
                  <div key={rec.id} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        rec.category === 'qsd' ? 'bg-blue-100 text-blue-600' :
                        rec.category === 'swppp' ? 'bg-green-100 text-green-600' :
                        'bg-orange-100 text-orange-600'
                      }`}>
                        {rec.category === 'qsd' ? <Award className="h-4 w-4" /> :
                         rec.category === 'swppp' ? <Shield className="h-4 w-4" /> :
                         <Mountain className="h-4 w-4" />}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {rec.title}
                      </p>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {rec.content}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(rec.createdAt).toLocaleDateString()} • {rec.citation}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No recommendations yet. Upload documents to get started.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Analysis Queue */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Brain className="h-5 w-5 mr-2" />
              Document Analysis Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analysesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : recentAnalyses?.length > 0 ? (
              <div className="space-y-4">
                {recentAnalyses.slice(0, 3).map((analysis: any) => (
                  <div key={analysis.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-4 w-4 text-accent" />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Analysis Complete
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {analysis.query}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Complete
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No analyses yet. Upload documents to get AI-powered insights.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg px-3 py-2 text-xs text-muted-foreground border">
        Powered by Stormwater-AI © Daniel Guzman
      </div>
    </div>
  );
}
