#include <bits/stdc++.h>
using namespace std;
bool isMagicSquare()
{
int n;
cin>>n;
int mat[n][n];
for(int i=0;i<n;i++)
{
for(int j=0;j<n;j++)
{
cin>>mat[i][j];
}
}
int sum = 0,sum2=0;
for (int i = 0; i < n; i++)
sum = sum + mat[i][i];
for (int i = 0; i < n; i++)
sum2 = sum2 + mat[i][n-1-i];
if(sum!=sum2)
return false;
for (int i = 0; i < n; i++) {
int rowSum = 0;
for (int j = 0; j < n; j++)
rowSum += mat[i][j];
if (rowSum != sum)
return false;
}
for (int i = 0; i < n; i++) {
int colSum = 0;
for (int j = 0; j < n; j++)
colSum += mat[j][i];
if (sum != colSum)
return false;
} 
return true;
}
int main(){
if (isMagicSquare())
cout<<"Yes";
else
cout<<"No";
return 0;
}